import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  console.log('=== DETALLE DE PASES REGISTRADOS HOY POR GRADO ===\n');

  const detail = await sql`
    SELECT 
      s.grado,
      ae.sede,
      COUNT(*) as total_pases,
      MIN(ae.timestamp AT TIME ZONE 'America/Bogota') as hora_primer_pase,
      MAX(ae.timestamp AT TIME ZONE 'America/Bogota') as hora_ultimo_pase
    FROM attendance_events ae
    LEFT JOIN students s ON s.id = ae.student_id
    WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = CURRENT_DATE
    GROUP BY s.grado, ae.sede
    ORDER BY s.grado ASC
  `;

  console.table(detail);
}

main().catch(console.error);
