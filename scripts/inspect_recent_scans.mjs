import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  console.log('=== INSPECCIONANDO ÚLTIMOS 20 PASES EN ATTENDANCE_EVENTS ===\n');

  const recentEvents = await sql`
    SELECT id, student_id, rfid_tag_uid, reader_id, tipo_evento, timestamp, origen, registrado_por, sede
    FROM attendance_events
    ORDER BY timestamp DESC
    LIMIT 20
  `;

  console.table(recentEvents);
}

main().catch(console.error);
