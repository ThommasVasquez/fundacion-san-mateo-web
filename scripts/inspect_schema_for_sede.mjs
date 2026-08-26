import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== INSPECCIÓN DE TABLAS: SEDE Y OBSERVACIONES ===');

  // Check columns of attendance_events
  const eventsCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'attendance_events'
    ORDER BY ordinal_position;
  `;
  console.log('Columnas de attendance_events:');
  console.table(eventsCols);

  // Check columns of attendance_readers
  const readersCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'attendance_readers'
    ORDER BY ordinal_position;
  `;
  console.log('Columnas de attendance_readers:');
  console.table(readersCols);

  // Sample data from attendance_readers
  const readers = await sql`SELECT * FROM attendance_readers;`;
  console.log('Lectores registrados:', readers);

  // Sample attendance_events with reader info
  const sampleEvents = await sql`
    SELECT 
      ae.id,
      ae.tipo_evento,
      ae.origen,
      ae.reader_id,
      ae.timestamp,
      s.nombre as estudiante,
      s.grado
    FROM attendance_events ae
    LEFT JOIN students s ON ae.student_id = s.id
    ORDER BY ae.timestamp DESC
    LIMIT 5;
  `;
  console.log('Muestra de eventos recientes:', sampleEvents);
}

main().catch(console.error);
