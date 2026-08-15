import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('Updating attendance_events_origen_check constraint in Neon DB...');

  await sql`ALTER TABLE attendance_events DROP CONSTRAINT IF EXISTS attendance_events_origen_check;`;
  await sql`ALTER TABLE attendance_events ADD CONSTRAINT attendance_events_origen_check CHECK (origen IN ('panel', 'movil_profesor', 'manual'));`;

  console.log('Constraint updated successfully to allow manual!');
}

main().catch(console.error);
