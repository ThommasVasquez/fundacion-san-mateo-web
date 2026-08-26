import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  console.log('=== INSPECCIONANDO TODOS LOS READER_ID EN HISTORIAL DE ATTENDANCE_EVENTS ===\n');

  const readerHistory = await sql`
    SELECT 
      reader_id,
      COUNT(*) as total_eventos,
      MIN(timestamp) as primer_evento,
      MAX(timestamp) as ultimo_evento
    FROM attendance_events
    GROUP BY reader_id
    ORDER BY total_eventos DESC
  `;

  console.log('Todos los reader_id que han registrado pases en la historia:');
  console.table(readerHistory);

  const registeredReaders = await sql`
    SELECT * FROM readers
  `;

  console.log('\nLectores registrados en la tabla `readers`:');
  console.table(registeredReaders);
}

main().catch(console.error);
