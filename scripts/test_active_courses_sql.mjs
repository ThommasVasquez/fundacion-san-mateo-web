import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-18';
  const targetShift = 'DIURNO';

  const rows = await sql`
    WITH active_courses_today AS (
      SELECT DISTINCT s.grado
      FROM attendance_events ae
      JOIN students s ON ae.student_id = s.id
      WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    )
    SELECT 
      s.id as student_id,
      s.nombre,
      s.grado,
      s.telefono,
      s.rfid_tag_uid,
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado,
      ae.id as event_id
    FROM students s
    JOIN active_courses_today act ON s.grado = act.grado
    LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE
      AND ae.id IS NULL
    ORDER BY turno_calculado, s.grado, s.nombre
  `;

  console.log('Total rows returned WITH active_courses_today filter:', rows.length);

  const filtered = rows.filter((r) => r.turno_calculado === targetShift);

  console.log('Filtered by DIURNO WITH active_courses_today:', filtered.length);
  
  // Group by grade
  const byGrade = {};
  filtered.forEach(r => {
    byGrade[r.grado] = (byGrade[r.grado] || 0) + 1;
  });

  console.log('Inasistencias por curso diurno activo hoy:', byGrade);
}

main().catch(console.error);
