import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dates = await sql`
    SELECT 
      DATE(timestamp AT TIME ZONE 'America/Bogota')::text as fecha,
      COUNT(*)::int as total_eventos,
      COUNT(DISTINCT student_id)::int as estudiantes_asistieron
    FROM attendance_events
    GROUP BY DATE(timestamp AT TIME ZONE 'America/Bogota')
    ORDER BY fecha DESC
    LIMIT 10;
  `;

  console.log('Attendance events grouped by date:', dates);
}

main().catch(console.error);
