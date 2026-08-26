import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== AUDITORÍA DE FECHAS Y REGISTROS DE ESCANEO ===');

  // Find all dates that have AT LEAST ONE attendance event in DB
  const datesWithScans = await sql`
    SELECT 
      DATE(timestamp AT TIME ZONE 'America/Bogota')::text as fecha,
      COUNT(*)::int as total_escaneos,
      COUNT(DISTINCT student_id)::int as estudiantes_unicos
    FROM attendance_events
    GROUP BY DATE(timestamp AT TIME ZONE 'America/Bogota')
    ORDER BY fecha DESC;
  `;

  console.log('Fechas que TIENEN registros de asistencia en la base de datos:');
  console.table(datesWithScans);
}

main().catch(console.error);
