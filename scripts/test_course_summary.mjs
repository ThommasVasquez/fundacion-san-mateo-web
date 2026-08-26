import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function getCourseSummary(dateStr) {
  const dateObj = new Date(`${dateStr}T12:00:00-05:00`);
  const dayOfWeek = dateObj.getDay();
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  if (isSunday) return { isSunday: true, courses: [] };

  const summary = await sql`
    SELECT 
      s.grado,
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado,
      COUNT(DISTINCT s.id)::int as total_matriculados,
      COUNT(DISTINCT ae.student_id)::int as asistieron,
      (COUNT(DISTINCT s.id) - COUNT(DISTINCT ae.student_id))::int as inasistentes
    FROM students s
    LEFT JOIN attendance_events ae 
      ON s.id = ae.student_id 
     AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE
      AND (
        (${isWeekday} AND (UPPER(s.grado) NOT LIKE '%SABADO%' AND UPPER(s.grado) NOT LIKE '%SB%')) OR
        (${isSaturday} AND (UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%'))
      )
    GROUP BY s.grado
    HAVING COUNT(DISTINCT ae.student_id) > 0 OR COUNT(DISTINCT s.id) <= 40
    ORDER BY inasistentes ASC, s.grado ASC;
  `;

  return { isSunday: false, courses: summary };
}

async function main() {
  console.log('=== PRUEBA DE RESUMEN DE ASISTENCIA POR CURSO (2026-08-26) ===');
  const res = await getCourseSummary('2026-08-26');
  console.table(res.courses);
}

main().catch(console.error);
