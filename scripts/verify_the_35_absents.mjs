import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-26';

  console.log(`=== VERIFICACIÓN TRANSPARENTE DE LAS 35 INASISTENCIAS DEL DÍA (${dateStr}) ===\n`);

  // 1. Cursos que asistieron hoy
  const activeCoursesRes = await sql`
    SELECT DISTINCT s.grado
    FROM attendance_events ae
    JOIN students s ON ae.student_id = s.id
    WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date;
  `;
  const activeCourses = activeCoursesRes.map(r => r.grado);

  console.log('1. Salones/Cursos que tuvieron marcación de asistencia hoy:');
  console.log(activeCourses);
  console.log('');

  // 2. Resumen por salón de los que asistieron hoy
  const courseSummary = await sql`
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
      AND s.grado = ANY(${activeCourses})
    GROUP BY s.grado
    ORDER BY s.grado;
  `;

  console.log('2. Conteo salón por salón:');
  console.table(courseSummary);

  // 3. Listado detallado persona por persona de las 35 inasistencias
  const absentList = await sql`
    SELECT 
      ROW_NUMBER() OVER (ORDER BY s.grado, s.nombre)::int as num,
      s.nombre as estudiante,
      s.grado,
      s.telefono
    FROM students s
    LEFT JOIN attendance_events ae 
      ON s.id = ae.student_id 
     AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE
      AND s.grado = ANY(${activeCourses})
      AND ae.id IS NULL
    ORDER BY s.grado, s.nombre;
  `;

  console.log(`3. Listado de los ${absentList.length} estudiantes inasistentes reales de hoy:`);
  console.table(absentList);
}

main().catch(console.error);
