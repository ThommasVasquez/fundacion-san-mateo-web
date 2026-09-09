import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

function cleanWords(name: string): string[] {
  if (!name) return [];
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function wordsMatch(wordsA: string[], wordsB: string[]): boolean {
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  if (setA.size === setB.size && [...setA].every(w => setB.has(w))) return true;

  let matchedWords = 0;
  const usedB = new Set<number>();
  for (const wa of wordsA) {
    let bestIdx = -1;
    let bestDist = 999;
    for (let i = 0; i < wordsB.length; i++) {
      if (usedB.has(i)) continue;
      const wb = wordsB[i];
      if (wa === wb) {
        bestIdx = i;
        bestDist = 0;
        break;
      }
      const dist = levenshtein(wa, wb);
      if (dist <= 2 && wa.length >= 4 && wb.length >= 4 && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1) {
      usedB.add(bestIdx);
      matchedWords++;
    }
  }

  const minLen = Math.min(wordsA.length, wordsB.length);
  if (minLen >= 3 && matchedWords >= minLen - 1) return true;
  if (minLen === 2 && matchedWords === 2) return true;
  if (matchedWords >= 3) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const validSecret = process.env.JWT_SECRET || 'fsm-admin-secret';

    // Allow execution if bearer token matches secret or if x-admin-unify header is present
    if (token !== validSecret && req.headers.get('x-admin-unify') !== 'unify-fsm-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[UNIFICATION] Starting Canonical Student Unification in Production DB...');

    // 1. Ensure columns
    await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS documento TEXT;`;
    await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS nombre_normalizado TEXT;`;
    await sql`UPDATE students SET documento = usuario_nro WHERE documento IS NULL AND usuario_nro IS NOT NULL;`;
    await sql`UPDATE students SET nombre_normalizado = REGEXP_REPLACE(UPPER(TRIM(TRANSLATE(nombre, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'))), '\s+', ' ', 'g') WHERE nombre_normalizado IS NULL;`;

    // 2. Ensure indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_arn_student_id ON attendance_records_normalized(student_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_arn_session_id ON attendance_records_normalized(session_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_enroll_student_id ON enrollments(student_id);`;

    // 3. Drop constraints on students_normalized
    await sql`ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;`;
    await sql`ALTER TABLE attendance_records_normalized DROP CONSTRAINT IF EXISTS attendance_records_normalized_student_id_fkey;`;

    // 4. Fetch students & normalized
    const students = await sql`SELECT id, nombre, rfid_tag_uid, tarjeta_numero, usuario_nro, activo, grado FROM students`;
    
    // Check if students_normalized is still a table or already a view
    const isViewRes = await sql`
      SELECT table_type FROM information_schema.tables 
      WHERE table_name = 'students_normalized';
    `;
    const isView = isViewRes[0]?.table_type === 'VIEW';

    let normalized: any[] = [];
    if (!isView) {
      normalized = await sql`SELECT id, nombre_original, documento, rfid_tag_uid FROM students_normalized`;
    }

    const studentWordMap = students.map((s: any) => ({
      ...s,
      words: cleanWords(s.nombre)
    }));

    const matches: Array<{ normId: string; canonId: string; normName: string; canonName: string }> = [];
    const unmatched: any[] = [];

    for (const norm of normalized) {
      const normWords = cleanWords(norm.nombre_original);
      const found = studentWordMap.find((s: any) => wordsMatch(normWords, s.words));
      if (found) {
        matches.push({ normId: norm.id, canonId: found.id, normName: norm.nombre_original, canonName: found.nombre });
      } else {
        unmatched.push(norm);
      }
    }

    // 5. Insert unmatched students into students
    for (const u of unmatched) {
      await sql`
        INSERT INTO students (id, nombre, nombre_normalizado, grado, documento, rfid_tag_uid, activo, rol, created_at)
        VALUES (
          ${u.id}::uuid,
          ${u.nombre_original},
          ${cleanWords(u.nombre_original).join(' ')},
          COALESCE((SELECT g.nombre FROM enrollments e JOIN groups g ON g.id = e.group_id WHERE e.student_id = ${u.id}::uuid LIMIT 1), 'NO ASIGNADO'),
          ${u.documento || null},
          ${u.rfid_tag_uid || null},
          TRUE,
          'Estudiante',
          NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `;
      matches.push({ normId: u.id, canonId: u.id, normName: u.nombre_original, canonName: u.nombre_original });
    }

    // 6. Migrate enrollments
    for (const m of matches) {
      if (m.normId !== m.canonId) {
        await sql`
          DELETE FROM enrollments 
          WHERE student_id = ${m.normId}::uuid 
            AND EXISTS (
              SELECT 1 FROM enrollments e2 
              WHERE e2.student_id = ${m.canonId}::uuid AND e2.group_id = enrollments.group_id
            );
        `;
        await sql`
          UPDATE enrollments 
          SET student_id = ${m.canonId}::uuid 
          WHERE student_id = ${m.normId}::uuid;
        `;
      }
    }

    // 7. Migrate attendance_records_normalized
    for (const m of matches) {
      if (m.normId !== m.canonId) {
        await sql`
          DELETE FROM attendance_records_normalized 
          WHERE student_id = ${m.normId}::uuid 
            AND EXISTS (
              SELECT 1 FROM attendance_records_normalized a2 
              WHERE a2.student_id = ${m.canonId}::uuid AND a2.session_id = attendance_records_normalized.session_id
            );
        `;
        await sql`
          UPDATE attendance_records_normalized 
          SET student_id = ${m.canonId}::uuid 
          WHERE student_id = ${m.normId}::uuid;
        `;
      }
    }

    // 8. Re-add foreign keys pointing to students(id)
    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_student_id_fkey'
        ) THEN
          ALTER TABLE enrollments 
          ADD CONSTRAINT enrollments_student_id_fkey 
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'attendance_records_normalized_student_id_fkey'
        ) THEN
          ALTER TABLE attendance_records_normalized 
          ADD CONSTRAINT attendance_records_normalized_student_id_fkey 
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `;

    // 9. Recreate students_normalized as a view on students
    if (!isView) {
      await sql`DROP TABLE IF EXISTS students_normalized CASCADE;`;
      await sql`
        CREATE OR REPLACE VIEW students_normalized AS 
        SELECT 
          id, 
          nombre as nombre_original, 
          nombre_normalizado, 
          COALESCE(usuario_nro, documento) as documento, 
          rfid_tag_uid, 
          CASE WHEN activo THEN 'ACTIVO' ELSE 'INACTIVO' END as estado, 
          created_at, 
          created_at as updated_at 
        FROM students;
      `;
    }

    // 10. Auto-enroll students in their designated groups (e.g. I DIURNO A CB, I PREESCOLAR)
    const cbGroupId = '32302dd7-a3be-4a01-9b6c-0b9ee963569b'; // I DIURNO A CB
    const cbStudents = await sql`SELECT id, nombre FROM students WHERE grado ILIKE '%I%DIUR%CB%'`;
    const cbSessions = await sql`SELECT id FROM class_sessions WHERE group_id = ${cbGroupId}::uuid`;

    for (const st of cbStudents) {
      // Remove any mismatch enrollment from fuzzy matching
      await sql`DELETE FROM enrollments WHERE student_id = ${st.id}::uuid AND group_id != ${cbGroupId}::uuid`;
      // Ensure enrolled in I DIURNO A CB
      const existing = await sql`SELECT id FROM enrollments WHERE student_id = ${st.id}::uuid AND group_id = ${cbGroupId}::uuid LIMIT 1`;
      if (existing.length === 0) {
        await sql`
          INSERT INTO enrollments (id, student_id, group_id, activo, created_at)
          VALUES (gen_random_uuid(), ${st.id}::uuid, ${cbGroupId}::uuid, true, NOW())
        `;
      }
      // Ensure attendance records exist for all group sessions
      for (const sess of cbSessions) {
        await sql`
          INSERT INTO attendance_records_normalized (id, student_id, session_id, estado, created_at, updated_at)
          VALUES (gen_random_uuid(), ${st.id}::uuid, ${sess.id}::uuid, 'AUSENTE', NOW(), NOW())
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // 11. Audit check
    const check = await sql`
      SELECT 
        (SELECT count(*) FROM students) as total_students,
        (SELECT count(*) FROM enrollments e JOIN students s ON s.id = e.student_id) as enrollments_on_students,
        (SELECT count(*) FROM attendance_records_normalized arn JOIN students s ON s.id = arn.student_id) as matrix_on_students,
        (SELECT count(*) FROM attendance_events ae JOIN students s ON s.id = ae.student_id) as events_on_students,
        (SELECT count(*) FROM enrollments WHERE group_id = ${cbGroupId}::uuid) as cb_diurno_enrolled;
    `;

    console.log('[UNIFICATION] Completed successfully:', check[0]);

    return NextResponse.json({
      success: true,
      message: 'Base de datos unificada con éxito en 1 sola tabla canónica de estudiantes.',
      audit: check[0]
    });

  } catch (error: any) {
    console.error('[UNIFICATION] Error running database unification:', error);
    return NextResponse.json({
      error: error.message || String(error),
      stack: error.stack
    }, { status: 500 });
  }
}
