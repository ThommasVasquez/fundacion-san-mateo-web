import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-18';

  console.log(`=== BÚSQUEDA DE LOS 23 ALUMNOS FALTANTES DEL DÍA (${dateStr}) ===`);

  // 1. Group by grade to see if ANY course has 23 absent or 23 total students
  const byGrade = await sql`
    SELECT 
      s.grado,
      COUNT(DISTINCT s.id)::int as total,
      COUNT(DISTINCT ae.student_id)::int as asistieron,
      (COUNT(DISTINCT s.id) - COUNT(DISTINCT ae.student_id))::int as inasistentes
    FROM students s
    LEFT JOIN attendance_events ae 
      ON s.id = ae.student_id 
     AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE
    GROUP BY s.grado
    ORDER BY inasistentes DESC;
  `;

  console.log('Todos los grados y sus inasistentes hoy:', byGrade);

  // 2. Check if there are any absence_followups created for today
  const followupsToday = await sql`
    SELECT 
      af.id,
      af.student_id,
      s.nombre,
      s.grado,
      af.se_llamo,
      af.estado_llamada,
      af.comentarios,
      af.fecha
    FROM absence_followups af
    JOIN students s ON af.student_id = s.id
    WHERE af.fecha = ${dateStr}::date;
  `;
  console.log(`Followups registrados para la fecha ${dateStr}:`, followupsToday);

  // 3. Check all active students in the DB who have an rfid_tag_uid linked vs not linked
  const studentTags = await sql`
    SELECT 
      COUNT(*)::int as total_activos,
      COUNT(rfid_tag_uid)::int as con_tarjeta,
      COUNT(*) - COUNT(rfid_tag_uid) as sin_tarjeta
    FROM students
    WHERE activo = TRUE;
  `;
  console.log('Estado de tarjetas RFID de estudiantes activos en BD:', studentTags);
}

main().catch(console.error);
