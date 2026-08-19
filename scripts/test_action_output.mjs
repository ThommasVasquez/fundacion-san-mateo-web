import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-18';
  const targetShift = 'DIURNO';

  const rows = await sql`
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
      ae.id as event_id,
      ae.timestamp::text as hora_entrada,
      af.id as followup_id,
      af.se_llamo,
      af.estado_llamada,
      af.comentarios,
      af.excusa_url,
      af.registrado_por,
      af.updated_at::text as fecha_seguimiento
    FROM students s
    LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    LEFT JOIN absence_followups af ON s.id = af.student_id AND af.fecha = ${dateStr}::date
    WHERE s.activo = TRUE
      AND ae.id IS NULL
    ORDER BY turno_calculado, s.grado, s.nombre
  `;

  console.log('Total rows returned by SQL query:', rows.length);

  const filtered = rows.filter((r) => r.turno_calculado === targetShift);

  console.log('Total filtered by targetShift = DIURNO:', filtered.length);
  console.log('First 5 filtered students:', filtered.slice(0, 5));
}

main().catch(console.error);
