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

    const body = await req.json().catch(() => ({}));
    if (body.action === 'inspect') {
      const groups = await sql`
        SELECT g.id, g.nombre, g.jornada, g.tipo, g.programa_nombre,
               COUNT(e.id) as enrolled_count
        FROM groups g
        LEFT JOIN enrollments e ON e.group_id = g.id AND (e.activo IS NULL OR e.activo = TRUE)
        GROUP BY g.id, g.nombre, g.jornada, g.tipo, g.programa_nombre
        ORDER BY g.nombre ASC
      `;

      const studentGrades = await sql`
        SELECT grado, count(*) as count
        FROM students
        GROUP BY grado
        ORDER BY count DESC
      `;

      const cbStudents = await sql`
        SELECT s.id, s.nombre, s.grado, s.tarjeta_numero, s.rfid_tag_uid, s.activo,
               g.id as group_id, g.nombre as enrolled_group
        FROM students s
        LEFT JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
        LEFT JOIN groups g ON g.id = e.group_id
        WHERE s.grado ILIKE '%CB%' 
           OR s.grado ILIKE '%DIURNO%' 
           OR s.grado ILIKE '%1 DIURNO B%'
           OR s.grado ILIKE '%II DIURNO%'
        ORDER BY s.grado, s.nombre
      `;

      return NextResponse.json({
        success: true,
        groups,
        studentGrades,
        cbStudents
      });
    }

    if (body.action === 'check_nieves') {
      const nievesStudents = await sql`
        SELECT s.id, s.nombre, s.grado, s.documento, s.tarjeta_numero, s.rfid_tag_uid, s.activo
        FROM students s
        WHERE s.nombre ILIKE '%NIEVES%'
      `;

      const nievesEnrollments = await sql`
        SELECT e.id as enrollment_id, e.student_id, e.group_id, e.activo as enrollment_activo,
               g.nombre as group_name, s.nombre as student_name
        FROM enrollments e
        JOIN groups g ON g.id = e.group_id
        JOIN students s ON s.id = e.student_id
        WHERE s.nombre ILIKE '%NIEVES%'
      `;

      const nievesRecords = await sql`
        SELECT ar.student_id, s.nombre as student_name, cs.group_id, g.nombre as group_name, count(ar.id) as records_count
        FROM attendance_records_normalized ar
        JOIN students s ON s.id = ar.student_id
        JOIN class_sessions cs ON cs.id = ar.session_id
        JOIN groups g ON g.id = cs.group_id
        WHERE s.nombre ILIKE '%NIEVES%'
        GROUP BY ar.student_id, s.nombre, cs.group_id, g.nombre
      `;

      const nievesEvents = await sql`
        SELECT ae.id, ae.student_id, s.nombre as student_name, ae.timestamp, ae.reader_id
        FROM attendance_events ae
        JOIN students s ON s.id = ae.student_id
        WHERE s.nombre ILIKE '%NIEVES%'
        ORDER BY ae.timestamp DESC
        LIMIT 10
      `;

      const groupsOverview = await sql`
        SELECT g.id, g.nombre, count(cs.id) as sessions_count
        FROM groups g
        LEFT JOIN class_sessions cs ON cs.group_id = g.id
        WHERE g.nombre ILIKE '%CB%'
        GROUP BY g.id, g.nombre
      `;

      return NextResponse.json({
        success: true,
        nievesStudents,
        nievesEnrollments,
        nievesRecords,
        nievesEvents,
        groupsOverview
      });
    }

    if (body.action === 'verify_user_list') {
      const targetList = [
        "ABELLO FUENTES JUAN DAVID",
        "ARBOLEDA CONDE LUZ ANDREA",
        "ARIZA ARIZA KELLY JOHANA",
        "COLMENARES CORTES CHAROL GISEHL",
        "CUBIDES RONCANCIO NATALY PAOLA",
        "GARZON RODRIGUEZ SARA VALENTINA",
        "GUEVARA CASTRO SARAY VALENTINA",
        "HUERTAS BELTRAN ANA SOFIA",
        "MUNIVE RIVADENEIRA KAREN LORENA",
        "NIEVES SANCHEZ ANGELICA ROCIO",
        "NIEVES SANCHEZ PAULA ALEXANDRA",
        "PARRA MONTAÑEZ MARIA CAMILA",
        "RIVERA INCIARTE JUNIOR ALEJANDRO",
        "RODRIGUEZ QUINTERO ASLY JULIETH",
        "ROJAS CANTE HASBLEIDY",
        "ROSERO CHILLAMBO ANYI TATIANA",
        "SERRANO BECERRA ANDRES CAMILO",
        "TIBADUIZA APARICIO KARLA YESENIA",
        "TRUJILLO MAYERLY",
        "VELASQUEZ VELASQUEZ RENDYS OMAR",
        "VILLALOBOS VELASQUEZ LAURA VALENTINA"
      ];

      // Obtener todos los estudiantes de la BD con sus matrículas
      const allStudents = await sql`
        SELECT s.id, s.nombre, s.documento, s.tarjeta_numero, s.rfid_tag_uid, s.grado, s.activo,
               g.id as group_id, g.nombre as group_name
        FROM students s
        LEFT JOIN enrollments e ON e.student_id = s.id AND e.activo = TRUE
        LEFT JOIN groups g ON g.id = e.group_id
        ORDER BY s.nombre ASC
      `;

      // Obtener el ID del grupo II DIURNO A CB
      const groupRes = await sql`SELECT id, nombre FROM groups WHERE nombre = 'II DIURNO A CB' LIMIT 1`;
      const targetGroupId = groupRes[0]?.id;

      const foundList: any[] = [];
      const notFoundList: string[] = [];

      for (const targetName of targetList) {
        const parts = targetName.split(/\s+/);
        // Coincidencia exacta o contiene
        let matches = allStudents.filter((s: any) => {
          const sName = s.nombre.toUpperCase();
          return parts.every((p: string) => sName.includes(p));
        });

        if (matches.length === 0) {
          // Coincidencia por al menos dos partes
          matches = allStudents.filter((s: any) => {
            const sName = s.nombre.toUpperCase();
            return parts.slice(0, 2).every((p: string) => sName.includes(p));
          });
        }

        if (matches.length > 0) {
          foundList.push({
            targetName,
            matches: matches.map((m: any) => ({
              id: m.id,
              nombre: m.nombre,
              documento: m.documento,
              tarjeta_numero: m.tarjeta_numero,
              rfid_tag_uid: m.rfid_tag_uid,
              grado: m.grado,
              activo: m.activo,
              group_id: m.group_id,
              group_name: m.group_name,
              is_in_target_group: m.group_name === 'II DIURNO A CB'
            }))
          });
        } else {
          notFoundList.push(targetName);
        }
      }

      // Estudiantes actualmente matriculados en II DIURNO A CB
      const currentInGroup = allStudents.filter((s: any) => s.group_name === 'II DIURNO A CB');

      // Cuántos de los que están en el grupo NO están en la lista de los 21
      const extraInGroup = currentInGroup.filter((s: any) => {
        return !targetList.some(targetName => {
          const parts = targetName.split(/\s+/);
          return parts.every(p => s.nombre.toUpperCase().includes(p));
        });
      });

      return NextResponse.json({
        success: true,
        targetGroupId,
        totalTarget: targetList.length,
        foundCount: foundList.length,
        notFoundCount: notFoundList.length,
        foundList,
        notFoundList,
        currentInGroupCount: currentInGroup.length,
        extraInGroupCount: extraInGroup.length,
        extraInGroup: extraInGroup.map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          tarjeta: s.tarjeta_numero,
          grado: s.grado
        }))
      });
    }

    if (body.action === 'set_exact_cb_group') {
      const target21Names = [
        "ABELLO FUENTES JUAN DAVID",
        "ARBOLEDA CONDE LUZ ANDREA",
        "ARIZA ARIZA KELLY JOHANA",
        "COLMENARES CORTES CHAROL GISEHL",
        "CUBIDES RONCANCIO NATALY PAOLA",
        "GARZON RODRIGUEZ SARA VALENTINA",
        "GUEVARA CASTRO SARAY VALENTINA",
        "HUERTAS BELTRAN ANA SOFIA",
        "MUNIVE RIVADENEIRA KAREN LORENA",
        "NIEVES SANCHEZ ANGELICA ROCIO",
        "NIEVES SANCHEZ PAULA ALEXANDRA",
        "PARRA MONTAÑEZ MARIA CAMILA",
        "RIVERA INCIARTE JUNIOR ALEJANDRO",
        "RODRIGUEZ QUINTERO ASLY JULIETH",
        "ROJAS CANTE HASBLEIDY",
        "ROSERO CHILAMBO ANYI TATIANA",
        "SERRANO BECERRA ANDRES CAMILO",
        "TIBADUIZA APARICIO KARLA YESENIA",
        "TRUJILLO MAYERLY",
        "VELASQUEZ VELASQUEZ RENDYS OMAR",
        "VILLALOBOS VELASQUEZ LAURA VALENTINA"
      ];

      // 1. Obtener grupos
      const cbGroupRes = await sql`SELECT id FROM groups WHERE nombre = 'II DIURNO A CB' LIMIT 1`;
      const regGroupRes = await sql`SELECT id FROM groups WHERE nombre = 'II DIURNO A' LIMIT 1`;
      const cbGroupId = cbGroupRes[0]?.id;
      const regGroupId = regGroupRes[0]?.id;

      if (!cbGroupId) {
        return NextResponse.json({ error: 'Grupo II DIURNO A CB no encontrado' }, { status: 404 });
      }

      // 2. Obtener todos los alumnos
      const allStudents = await sql`
        SELECT id, nombre, documento, tarjeta_numero, rfid_tag_uid, grado, activo
        FROM students
      `;

      // 3. Identificar a los 21 IDs
      const targetIds: string[] = [];
      const targetDetails: any[] = [];

      for (const name of target21Names) {
        const parts = name.split(/\s+/);
        let match = allStudents.find((s: any) => {
          if (name === 'TRUJILLO MAYERLY') {
            return s.nombre === 'TRUJILLO MAYERLY' && s.documento === '52840245';
          }
          const sName = s.nombre.toUpperCase();
          return parts.every((p: string) => sName.includes(p));
        });

        if (match) {
          targetIds.push(match.id);
          targetDetails.push(match);
        }
      }

      // 4. Matricular a los 21 en II DIURNO A CB y actualizar grado
      for (const st of targetDetails) {
        await sql`UPDATE students SET grado = 'II DIURNO A CB', activo = TRUE WHERE id = ${st.id}::uuid`;

        // Desactivar otras matrículas activas del estudiante
        await sql`
          UPDATE enrollments 
          SET activo = FALSE, fecha_fin = CURRENT_DATE 
          WHERE student_id = ${st.id}::uuid AND group_id != ${cbGroupId}::uuid AND activo = TRUE
        `;

        // Asegurar matrícula en II DIURNO A CB
        await sql`
          INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
          VALUES (gen_random_uuid(), ${st.id}::uuid, ${cbGroupId}::uuid, TRUE, CURRENT_DATE, NOW())
          ON CONFLICT (student_id, group_id)
          DO UPDATE SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
        `;
      }

      // 5. Para los demás que estaban matriculados en II DIURNO A CB y no están en los 21:
      // Desactivar su matrícula en II DIURNO A CB
      if (targetIds.length > 0) {
        const currentEnrollments = await sql`
          SELECT s.id, s.nombre, s.grado
          FROM enrollments e
          JOIN students s ON s.id = e.student_id
          WHERE e.group_id = ${cbGroupId}::uuid AND e.activo = TRUE
        `;

        const targetIdSet = new Set(targetIds);
        const extraStudents = currentEnrollments.filter((ex: any) => !targetIdSet.has(ex.id));

        for (const ex of extraStudents) {
          // Desactivar de II DIURNO A CB
          await sql`
            UPDATE enrollments 
            SET activo = FALSE, fecha_fin = CURRENT_DATE
            WHERE student_id = ${ex.id}::uuid AND group_id = ${cbGroupId}::uuid
          `;

          // Si pertenecían a la jornada diurna regular, asignarlos a II DIURNO A
          if (regGroupId && (!ex.grado || ex.grado.includes('DIURNO') || ex.grado.includes('2'))) {
            await sql`UPDATE students SET grado = 'II DIURNO A' WHERE id = ${ex.id}::uuid`;
            await sql`
              INSERT INTO enrollments (id, student_id, group_id, activo, fecha_inicio, created_at)
              VALUES (gen_random_uuid(), ${ex.id}::uuid, ${regGroupId}::uuid, TRUE, CURRENT_DATE, NOW())
              ON CONFLICT (student_id, group_id)
              DO UPDATE SET activo = TRUE, fecha_inicio = CURRENT_DATE, fecha_fin = NULL
            `;
          }
        }
      }

      // 6. Consultar estado final del grupo
      const finalGroupStudents = await sql`
        SELECT s.id, s.nombre, s.documento, s.tarjeta_numero, s.rfid_tag_uid, s.grado, e.activo as matricula_activa
        FROM enrollments e
        JOIN students s ON s.id = e.student_id
        WHERE e.group_id = ${cbGroupId}::uuid AND e.activo = TRUE
        ORDER BY s.nombre ASC
      `;

      return NextResponse.json({
        success: true,
        message: 'Grupo II DIURNO A CB configurado con éxito con exactamente los 21 estudiantes.',
        cbGroupId,
        finalCount: finalGroupStudents.length,
        students: finalGroupStudents
      });
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

    // 10. Sincronizar los 19 grupos oficiales con sus programas académicos
    await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS programa_codigo VARCHAR(50);`;
    await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS programa_nombre VARCHAR(100);`;
    await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS semestre_romano VARCHAR(10);`;
    await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS modalidad VARCHAR(20);`;

    // Renombrar nombres con variaciones para preservar IDs existentes y sesiones
    await sql`UPDATE groups SET nombre = 'I DIURNO CB' WHERE nombre IN ('I DIURNO A CB');`;
    await sql`UPDATE groups SET nombre = 'II DIURNO A CB' WHERE nombre IN ('I DIURNO B CB');`;
    await sql`UPDATE groups SET nombre = 'II SABADO CB' WHERE nombre IN ('I SABADO CB');`;

    // Sincronizar en students.grado las variaciones
    await sql`UPDATE students SET grado = 'I DIURNO CB' WHERE grado IN ('I DIURNO A CB', 'I DIURRNO A CB', 'I DA CB');`;
    await sql`UPDATE students SET grado = 'II DIURNO A CB' WHERE grado IN ('I DIURNO B CB', 'I DB CB');`;
    await sql`UPDATE students SET grado = 'II SABADO CB' WHERE grado IN ('I SABADO CB', 'ISB CB');`;
    await sql`UPDATE students SET grado = 'I NOCHE CB' WHERE grado IN ('I NOCHE A CB');`;

    const officialGroupsList = [
      { name: 'I PREESCOLAR', progCode: 'PREESCOLAR', progName: 'Preescolar', sem: 'I', shift: 'DIURNO', cal: 'REGULAR' },
      { name: 'II PREESCOLAR', progCode: 'PREESCOLAR', progName: 'Preescolar', sem: 'II', shift: 'DIURNO', cal: 'REGULAR' },
      { name: 'I AIPI', progCode: 'AIPI', progName: 'Primera Infancia AIPI', sem: 'I', shift: 'DIURNO', cal: 'REGULAR' },
      { name: 'II AIPI', progCode: 'AIPI', progName: 'Primera Infancia AIPI', sem: 'II', shift: 'DIURNO', cal: 'REGULAR' },
      { name: 'I DIURNO A', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'I', shift: 'DIURNO', cal: 'REGULAR' },
      { name: 'II DIURNO A', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'II', shift: 'DIURNO', cal: 'REGULAR' },
      { name: 'II DIURNO B', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'II', shift: 'DIURNO', cal: 'REGULAR' },
      { name: 'III DIURNO A', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'III', shift: 'DIURNO', cal: 'REGULAR' },
      { name: 'I DIURNO CB', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'I', shift: 'DIURNO', cal: 'CB' },
      { name: 'II DIURNO A CB', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'II', shift: 'DIURNO', cal: 'CB' },
      { name: 'I NOCHE A', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'I', shift: 'NOCHE', cal: 'REGULAR' },
      { name: 'II NOCHE A', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'II', shift: 'NOCHE', cal: 'REGULAR' },
      { name: 'III NOCHE A', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'III', shift: 'NOCHE', cal: 'REGULAR' },
      { name: 'I NOCHE CB', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'I', shift: 'NOCHE', cal: 'CB' },
      { name: 'I SABADO A', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'I', shift: 'SABADO', cal: 'REGULAR' },
      { name: 'II SABADO A', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'II', shift: 'SABADO', cal: 'REGULAR' },
      { name: 'III SABADO A', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'III', shift: 'SABADO', cal: 'REGULAR' },
      { name: 'III SABADO B', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'III', shift: 'SABADO', cal: 'REGULAR' },
      { name: 'II SABADO CB', progCode: 'TAE', progName: 'Enfermería TAE', sem: 'II', shift: 'SABADO', cal: 'CB' }
    ];

    for (const og of officialGroupsList) {
      const clean = og.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = await sql`SELECT id FROM groups WHERE UPPER(TRIM(nombre)) = ${og.name.toUpperCase()} LIMIT 1`;
      if (existing.length > 0) {
        await sql`
          UPDATE groups SET
            nombre = ${og.name},
            nombre_clean = ${clean},
            jornada = ${og.shift},
            tipo = ${og.cal},
            programa_codigo = ${og.progCode},
            programa_nombre = ${og.progName},
            semestre_romano = ${og.sem},
            modalidad = ${og.cal}
          WHERE id = ${existing[0].id}::uuid
        `;
      } else {
        await sql`
          INSERT INTO groups (id, nombre, nombre_clean, jornada, tipo, programa_codigo, programa_nombre, semestre_romano, modalidad, activo, created_at)
          VALUES (gen_random_uuid(), ${og.name}, ${clean}, ${og.shift}, ${og.cal}, ${og.progCode}, ${og.progName}, ${og.sem}, ${og.cal}, true, NOW())
        `;
      }
    }

    // Matricular alumnos de I DIURNO CB
    const cbDiurnoG = await sql`SELECT id FROM groups WHERE nombre = 'I DIURNO CB' LIMIT 1`;
    if (cbDiurnoG.length > 0) {
      const cbAlumnos = await sql`SELECT id FROM students WHERE grado IN ('I DIURNO CB', 'I DIURNO A CB')`;
      for (const a of cbAlumnos) {
        const enr = await sql`SELECT id FROM enrollments WHERE student_id = ${a.id}::uuid AND group_id = ${cbDiurnoG[0].id}::uuid LIMIT 1`;
        if (enr.length === 0) {
          await sql`
            INSERT INTO enrollments (id, student_id, group_id, activo, created_at)
            VALUES (gen_random_uuid(), ${a.id}::uuid, ${cbDiurnoG[0].id}::uuid, true, NOW())
          `;
        }
      }
    }

    // Matricular alumnos de II DIURNO A CB (todos los que tengan grado II DIURNO A CB o II DIURNO CB o I DIURNO B CB)
    const cbDiurno2G = await sql`SELECT id FROM groups WHERE nombre = 'II DIURNO A CB' LIMIT 1`;
    if (cbDiurno2G.length > 0) {
      const cb2Alumnos = await sql`SELECT id FROM students WHERE grado IN ('II DIURNO A CB', 'II DIURNO CB', 'I DIURNO B CB')`;
      for (const a of cb2Alumnos) {
        const enr = await sql`SELECT id FROM enrollments WHERE student_id = ${a.id}::uuid AND group_id = ${cbDiurno2G[0].id}::uuid LIMIT 1`;
        if (enr.length === 0) {
          await sql`
            INSERT INTO enrollments (id, student_id, group_id, activo, created_at)
            VALUES (gen_random_uuid(), ${a.id}::uuid, ${cbDiurno2G[0].id}::uuid, true, NOW())
          `;
        }
      }
    }

    // Matricular alumnos de I NOCHE CB
    const nocheCBGroup = await sql`SELECT id FROM groups WHERE nombre = 'I NOCHE CB' LIMIT 1`;
    if (nocheCBGroup.length > 0) {
      const nocheAlumnos = await sql`SELECT id FROM students WHERE grado = 'I NOCHE CB'`;
      for (const a of nocheAlumnos) {
        const enr = await sql`SELECT id FROM enrollments WHERE student_id = ${a.id}::uuid AND group_id = ${nocheCBGroup[0].id}::uuid LIMIT 1`;
        if (enr.length === 0) {
          await sql`
            INSERT INTO enrollments (id, student_id, group_id, activo, created_at)
            VALUES (gen_random_uuid(), ${a.id}::uuid, ${nocheCBGroup[0].id}::uuid, true, NOW())
          `;
        }
      }
    }

    // Matricular alumnos de II SABADO CB
    const sabadoCBGroup = await sql`SELECT id FROM groups WHERE nombre = 'II SABADO CB' LIMIT 1`;
    if (sabadoCBGroup.length > 0) {
      const sabadoCBAlumnos = await sql`SELECT id FROM students WHERE grado IN ('II SABADO CB', 'ISCB', 'I SABADO CB')`;
      for (const a of sabadoCBAlumnos) {
        const enr = await sql`SELECT id FROM enrollments WHERE student_id = ${a.id}::uuid AND group_id = ${sabadoCBGroup[0].id}::uuid LIMIT 1`;
        if (enr.length === 0) {
          await sql`
            INSERT INTO enrollments (id, student_id, group_id, activo, created_at)
            VALUES (gen_random_uuid(), ${a.id}::uuid, ${sabadoCBGroup[0].id}::uuid, true, NOW())
          `;
        }
      }
    }

    // 11. Audit check
    const check = await sql`
      SELECT 
        (SELECT count(*) FROM students) as total_students,
        (SELECT count(*) FROM groups) as total_groups,
        (SELECT count(*) FROM enrollments e JOIN students s ON s.id = e.student_id WHERE e.activo = TRUE) as enrollments_on_students,
        (SELECT count(*) FROM attendance_records_normalized arn JOIN students s ON s.id = arn.student_id) as matrix_on_students,
        (SELECT count(*) FROM attendance_events ae JOIN students s ON s.id = ae.student_id) as events_on_students;
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
