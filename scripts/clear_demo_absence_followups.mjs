import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('Clearing all demo absence follow-ups records from absence_followups table...');

  await sql`TRUNCATE TABLE absence_followups RESTART IDENTITY CASCADE;`;

  console.log('Table absence_followups cleared completely.');
}

main().catch(console.error);
