import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  console.log('=== INSPECCIONANDO CASO LAGUNA LOPEZ KAREN SOFIA ===\n');

  const student = await sql`
    SELECT * FROM students_normalized
    WHERE nombre_normalizado LIKE '%LAGUNA%LOPEZ%KAREN%'
  `;
  console.log('Estudiante normalizado:');
  console.table(student);

  if (student.length === 0) return;

  const stId = student[0].id;

  const enrollments = await sql`
    SELECT e.*, g.nombre as group_name
    FROM enrollments e
    JOIN groups g ON g.id = e.group_id
    WHERE e.student_id = ${stId}::uuid
  `;
  console.log('\nMatrículas del estudiante:');
  console.table(enrollments);

  const sessions = await sql`
    SELECT cs.id as session_id, cs.fecha, cs.dia_semana_texto, g.nombre as group_name
    FROM class_sessions cs
    JOIN enrollments e ON e.group_id = cs.group_id
    JOIN groups g ON g.id = cs.group_id
    WHERE e.student_id = ${stId}::uuid
    ORDER BY cs.fecha DESC
    LIMIT 15
  `;
  console.log('\nSesiones de clase programadas para sus grupos:');
  console.table(sessions);

  const records = await sql`
    SELECT ar.*, cs.fecha
    FROM attendance_records_normalized ar
    JOIN class_sessions cs ON cs.id = ar.session_id
    WHERE ar.student_id = ${stId}::uuid
    ORDER BY cs.fecha DESC
    LIMIT 15
  `;
  console.log('\nRegistros de asistencia existentes en attendance_records_normalized:');
  console.table(records);

  const rfids = await sql`
    SELECT ae.*
    FROM attendance_events ae
    JOIN students s ON s.id = ae.student_id
    WHERE s.nombre LIKE '%LAGUNA%LOPEZ%KAREN%'
    ORDER BY ae.timestamp DESC
  `;
  console.log('\nEscaneos RFID reales en attendance_events:');
  console.table(rfids);
}

main().catch(console.error);
