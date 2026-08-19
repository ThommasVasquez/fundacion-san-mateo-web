import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-18';
  const dayOfWeek = new Date(`${dateStr}T12:00:00-05:00`).getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  console.log(`Date: ${dateStr}, Day of Week: ${dayOfWeek} (0=Sun, 6=Sat)`);

  const studentsByShift = await sql`
    SELECT 
      CASE 
        WHEN UPPER(grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(grado) LIKE '%SABADO%' OR UPPER(grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado,
      COUNT(*)::int as total_estudiantes
    FROM students
    WHERE activo = TRUE
    GROUP BY turno_calculado;
  `;

  console.log('Total active students by shift:', studentsByShift);

  const scannedByShift = await sql`
    SELECT 
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado,
      COUNT(DISTINCT s.id)::int as estudiantes_asistieron
    FROM attendance_events ae
    JOIN students s ON ae.student_id = s.id
    WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    GROUP BY turno_calculado;
  `;

  console.log(`Scanned students by shift on ${dateStr}:`, scannedByShift);
}

main().catch(console.error);
