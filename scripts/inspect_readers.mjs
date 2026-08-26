import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  console.log('=== INSPECCIONANDO LECTORES RFID Y REGISTROS DE ASISTENCIA EN NEON DB ===\n');

  const readers = await sql`
    SELECT * FROM readers
  `;

  console.log('Lectores RFID en DB (`readers`):');
  console.table(readers);

  const eventsSummary = await sql`
    SELECT 
      COALESCE(sede, 'Sin Sede (Null)') as sede_nombre,
      reader_id,
      origen,
      COUNT(*) as total_eventos
    FROM attendance_events
    WHERE DATE(timestamp AT TIME ZONE 'America/Bogota') = CURRENT_DATE
    GROUP BY sede, reader_id, origen
    ORDER BY total_eventos DESC
  `;

  console.log('\nResumen de pases / marcaciones de HOY por Sede y Lector:');
  console.table(eventsSummary);
}

main().catch(console.error);
