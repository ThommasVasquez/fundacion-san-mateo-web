import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const distinctGrados = await sql`
    SELECT DISTINCT grado FROM students ORDER BY grado;
  `;
  console.log('Distinct grados/turnos in students table:', distinctGrados);
}

main().catch(console.error);
