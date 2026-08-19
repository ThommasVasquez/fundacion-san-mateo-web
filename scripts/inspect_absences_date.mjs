import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-19';

  console.log(`Checking attendance and absences for date: ${dateStr}...`);

  // Count attendance events on 2026-08-19
  const eventsCount = await sql`
    SELECT COUNT(*)::int as count
    FROM attendance_events
    WHERE DATE(timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date;
  `;

  console.log(`Total attendance events on ${dateStr}:`, eventsCount[0].count);

  // Get distinct student_ids that scanned on 2026-08-19
  const scannedStudents = await sql`
    SELECT DISTINCT student_id
    FROM attendance_events
    WHERE DATE(timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
      AND student_id IS NOT NULL;
  `;

  console.log(`Students who scanned on ${dateStr}:`, scannedStudents.length);

  // Fetch absent active students
  const absentStudents = await sql`
    SELECT 
      s.id as student_id,
      s.nombre,
      s.grado,
      s.telefono,
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado,
      af.id as followup_id,
      af.se_llamo,
      af.estado_llamada,
      af.comentarios
    FROM students s
    LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    LEFT JOIN absence_followups af ON s.id = af.student_id AND af.fecha = ${dateStr}::date
    WHERE s.activo = TRUE
      AND ae.id IS NULL
    ORDER BY turno_calculado, s.grado, s.nombre;
  `;

  console.log(`Total absent active students query output for ${dateStr}:`, absentStudents.length);
  console.log('First 5 absent students:', absentStudents.slice(0, 5));
}

main().catch(console.error);
