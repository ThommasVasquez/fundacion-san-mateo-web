import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('Inspecting attendance_events_origen_check constraint...');

  const constraints = await sql`
    SELECT pg_get_constraintdef(c.oid) AS constraint_def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_events' AND c.conname = 'attendance_events_origen_check';
  `;

  console.log('Constraint definition:', constraints);

  const distinctOrigen = await sql`
    SELECT DISTINCT origen FROM attendance_events;
  `;
  console.log('Existing distinct origen values in table:', distinctOrigen);
}

main().catch(console.error);
