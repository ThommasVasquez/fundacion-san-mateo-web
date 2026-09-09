import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

function cleanWords(name) {
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

function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
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

function wordsMatch(wordsA, wordsB) {
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  if (setA.size === setB.size && [...setA].every(w => setB.has(w))) return true;

  let matchedWords = 0;
  const usedB = new Set();
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

async function runMigration() {
  console.log('--- STARTING CANONICAL STUDENT UNIFICATION ---');
  
  // 1. Ensure columns
  await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS documento TEXT;`;
  await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS nombre_normalizado TEXT;`;
  await sql`UPDATE students SET documento = usuario_nro WHERE documento IS NULL AND usuario_nro IS NOT NULL;`;
  await sql`UPDATE students SET nombre_normalizado = REGEXP_REPLACE(UPPER(TRIM(TRANSLATE(nombre, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'))), '\s+', ' ', 'g') WHERE nombre_normalizado IS NULL;`;

  const students = await sql`SELECT id, nombre, rfid_tag_uid, tarjeta_numero, usuario_nro, activo, grado FROM students`;
  const normalized = await sql`SELECT id, nombre_original, documento, rfid_tag_uid FROM students_normalized`;

  console.log(`Loaded ${students.length} students and ${normalized.length} normalized.`);

  const studentWordMap = students.map(s => ({
    ...s,
    words: cleanWords(s.nombre)
  }));

  const matches = [];
  const unmatched = [];

  for (const norm of normalized) {
    const normWords = cleanWords(norm.nombre_original);
    const found = studentWordMap.find(s => wordsMatch(normWords, s.words));
    if (found) {
      matches.push({ normId: norm.id, canonId: found.id, normName: norm.nombre_original, canonName: found.nombre });
    } else {
      unmatched.push(norm);
    }
  }

  console.log(`Matched: ${matches.length} | Unmatched: ${unmatched.length}`);

  // 2. Drop old foreign keys pointing to students_normalized
  console.log('Dropping old foreign key constraints pointing to students_normalized...');
  await sql`ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;`;
  await sql`ALTER TABLE attendance_records_normalized DROP CONSTRAINT IF EXISTS attendance_records_normalized_student_id_fkey;`;

  // 3. Insert any unmatched normalized students into students table
  for (const u of unmatched) {
    console.log(`Inserting new student from normalized: "${u.nombre_original}" (${u.id})`);
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
      ON CONFLICT (id) DO NOTHING
    `;
    matches.push({ normId: u.id, canonId: u.id, normName: u.nombre_original, canonName: u.nombre_original });
  }

  // 4. Migrate enrollments & attendance_records_normalized to canonical students
  console.log('Migrating enrollments to canonical student IDs in batches...');
  for (const m of matches) {
    if (m.normId !== m.canonId) {
      // Remove any duplicate enrollment for same group
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
  console.log(`Enrollments updated.`);

  console.log('Migrating attendance_records_normalized to canonical student IDs in batches...');
  for (const m of matches) {
    if (m.normId !== m.canonId) {
      // Remove any duplicate attendance record for same session
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
  console.log(`Attendance records updated.`);

  // 5. Add new foreign key constraints pointing to students(id)
  console.log('Adding new foreign key constraints pointing to canonical students table...');
  await sql`
    ALTER TABLE enrollments 
    ADD CONSTRAINT enrollments_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  `;
  await sql`
    ALTER TABLE attendance_records_normalized 
    ADD CONSTRAINT attendance_records_normalized_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
  `;
  console.log('Foreign keys updated to students(id).');

  // 6. Sync students_normalized with students so any legacy query gets the exact same unified data
  console.log('Syncing students_normalized table with canonical students...');
  await sql`TRUNCATE TABLE students_normalized;`;
  await sql`
    INSERT INTO students_normalized (id, nombre_original, nombre_normalizado, documento, rfid_tag_uid, estado, created_at, updated_at)
    SELECT id, nombre, nombre_normalizado, documento, rfid_tag_uid, CASE WHEN activo THEN 'ACTIVO' ELSE 'INACTIVO' END, created_at, NOW()
    FROM students;
  `;
  console.log('students_normalized is now a 1:1 replica of students.');

  // 4. Verification queries
  const checkEnroll = await sql`
    SELECT COUNT(*) as total, 
           COUNT(*) FILTER (WHERE s.id IS NOT NULL) as valid_students
    FROM enrollments e
    LEFT JOIN students s ON s.id = e.student_id;
  `;
  console.log('Enrollments check:', checkEnroll[0]);

  const checkMatrix = await sql`
    SELECT COUNT(*) as total, 
           COUNT(*) FILTER (WHERE s.id IS NOT NULL) as valid_students
    FROM attendance_records_normalized arn
    LEFT JOIN students s ON s.id = arn.student_id;
  `;
  console.log('Matrix records check:', checkMatrix[0]);

  const checkEvents = await sql`
    SELECT COUNT(*) as total, 
           COUNT(*) FILTER (WHERE s.id IS NOT NULL) as valid_students
    FROM attendance_events ae
    LEFT JOIN students s ON s.id = ae.student_id;
  `;
  console.log('Events check:', checkEvents[0]);

  console.log('--- CANONICAL UNIFICATION COMPLETED SUCCESSFULLY ---');
}

runMigration().catch(console.error);
