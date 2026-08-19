import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-18';

  // Find courses that had AT LEAST ONE scan today
  const activeCoursesToday = await sql`
    SELECT DISTINCT s.grado
    FROM attendance_events ae
    JOIN students s ON ae.student_id = s.id
    WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date;
  `;

  const gradosList = activeCoursesToday.map(r => r.grado);
  console.log('Cursos que tuvieron al menos 1 marcación hoy:', gradosList);

  // Now count students ONLY in these active courses
  const statsInActiveCourses = await sql`
    SELECT 
      s.grado,
      COUNT(DISTINCT s.id)::int as total_matriculados,
      COUNT(DISTINCT ae.student_id)::int as asistieron,
      (COUNT(DISTINCT s.id) - COUNT(DISTINCT ae.student_id))::int as inasistentes
    FROM students s
    LEFT JOIN attendance_events ae 
      ON s.id = ae.student_id 
     AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE
      AND s.grado = ANY(${gradosList})
    GROUP BY s.grado
    ORDER BY s.grado;
  `;

  console.log('Estadísticas sólo para los cursos que tuvieron clase hoy:', statsInActiveCourses);

  const totalInasistentesActiveCourses = statsInActiveCourses.reduce((sum, r) => sum + r.inasistentes, 0);
  console.log('Total inasistentes acumulados en cursos activos hoy:', totalInasistentesActiveCourses);
}

main().catch(console.error);
