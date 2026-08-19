import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-18';

  console.log(`=== ANÁLISIS DE GRADOS Y ASISTENCIA DIURNA (${dateStr}) ===`);

  const breakdownByGrado = await sql`
    SELECT 
      s.grado,
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado,
      COUNT(DISTINCT s.id)::int as total_estudiantes,
      COUNT(DISTINCT ae.student_id)::int as asistieron,
      (COUNT(DISTINCT s.id) - COUNT(DISTINCT ae.student_id))::int as inasistentes
    FROM students s
    LEFT JOIN attendance_events ae 
      ON s.id = ae.student_id 
     AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE
    GROUP BY s.grado
    ORDER BY turno_calculado, s.grado;
  `;

  console.log('Breakdown by Grado/Course:', breakdownByGrado);
}

main().catch(console.error);
