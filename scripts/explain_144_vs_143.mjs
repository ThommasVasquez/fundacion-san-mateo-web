import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-18';

  console.log(`=== AUDITORÍA DETALLADA: 144 EVENTOS VS 143 INASISTENCIAS (${dateStr}) ===`);

  // 1. All attendance events today
  const events = await sql`
    SELECT 
      ae.id,
      ae.tipo_evento,
      ae.student_id,
      s.nombre,
      s.grado
    FROM attendance_events ae
    LEFT JOIN students s ON ae.student_id = s.id
    WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date;
  `;

  console.log(`1. Total filas de marcación en attendance_events hoy: ${events.length}`);

  // Count by tipo_evento
  const entradas = events.filter(e => e.tipo_evento === 'entrada').length;
  const salidas = events.filter(e => e.tipo_evento === 'salida').length;
  console.log(`   - Entradas: ${entradas}`);
  console.log(`   - Salidas: ${salidas}`);

  // Count distinct students
  const scannedStudentIds = Array.from(new Set(events.map(e => e.student_id).filter(Boolean)));
  console.log(`   - Estudiantes ÚNICOS distintos que marcaron hoy: ${scannedStudentIds.length}`);

  // 2. Breakdown per course of ALL courses that had at least 1 scan
  const activeCourses = await sql`
    SELECT DISTINCT s.grado
    FROM attendance_events ae
    JOIN students s ON ae.student_id = s.id
    WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date;
  `;

  const grados = activeCourses.map(c => c.grado);

  const courseAudit = await sql`
    SELECT 
      s.grado,
      COUNT(DISTINCT s.id)::int as matriculados_en_bd,
      COUNT(DISTINCT ae.student_id)::int as asistieron_hoy,
      (COUNT(DISTINCT s.id) - COUNT(DISTINCT ae.student_id))::int as inasistentes_hoy
    FROM students s
    LEFT JOIN attendance_events ae 
      ON s.id = ae.student_id 
     AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE
      AND s.grado = ANY(${grados})
    GROUP BY s.grado
    ORDER BY s.grado;
  `;

  console.log('\n2. Auditoría curso por curso de los cursos activos hoy:');
  console.table(courseAudit);

  const sumMatriculados = courseAudit.reduce((acc, c) => acc + c.matriculados_en_bd, 0);
  const sumAsistieron = courseAudit.reduce((acc, c) => acc + c.asistieron_hoy, 0);
  const sumInasistentes = courseAudit.reduce((acc, c) => acc + c.inasistentes_hoy, 0);

  console.log('\nSUMATORIAS EN CURSOS ACTIVOS HOY:');
  console.log(`Total Matriculados en estos cursos: ${sumMatriculados}`);
  console.log(`Total Estudiantes ÚNICOS que asistieron: ${sumAsistieron}`);
  console.log(`Total Estudiantes ÚNICOS inasistentes: ${sumInasistentes}`);
}

main().catch(console.error);
