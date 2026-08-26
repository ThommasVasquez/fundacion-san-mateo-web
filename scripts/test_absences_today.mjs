import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-26';

  console.log(`Checking absences for today: ${dateStr}...`);

  // Count attendance events today
  const scansToday = await sql`
    SELECT COUNT(*)::int as count FROM attendance_events
    WHERE DATE(timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date;
  `;
  console.log(`Scans on ${dateStr}:`, scansToday[0].count);

  // Query 1: WITH active_courses_today
  const withJoin = await sql`
    WITH active_courses_today AS (
      SELECT DISTINCT s.grado
      FROM attendance_events ae
      JOIN students s ON ae.student_id = s.id
      WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    )
    SELECT COUNT(*)::int as count
    FROM students s
    JOIN active_courses_today act ON s.grado = act.grado
    LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE AND ae.id IS NULL;
  `;
  console.log('Absents WITH active_courses_today JOIN:', withJoin[0].count);

  // Query 2: WITHOUT active_courses_today JOIN (All active students for weekday shifts)
  const withoutJoin = await sql`
    SELECT 
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado,
      COUNT(*)::int as absent_count
    FROM students s
    LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE AND ae.id IS NULL
    GROUP BY turno_calculado;
  `;
  console.log('Absents WITHOUT JOIN (grouped by shift):', withoutJoin);
}

main().catch(console.error);
