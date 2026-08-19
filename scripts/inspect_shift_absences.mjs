import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-18';

  const rows = await sql`
    SELECT 
      s.id as student_id,
      s.nombre,
      s.grado,
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado
    FROM students s
    LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE
      AND ae.id IS NULL
    ORDER BY turno_calculado, s.grado, s.nombre;
  `;

  const noche = rows.filter(r => r.turno_calculado === 'NOCHE');
  const diurno = rows.filter(r => r.turno_calculado === 'DIURNO');
  const sabado = rows.filter(r => r.turno_calculado === 'SABADO');

  console.log(`On ${dateStr}:`);
  console.log(`Total absent students: ${rows.length}`);
  console.log(`- Turno Noche absent: ${noche.length}`);
  console.log(`- Turno Diurno absent: ${diurno.length}`);
  console.log(`- Turno Sábado absent: ${sabado.length}`);
}

main().catch(console.error);
