import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || "postgresql://neondb_owner:npg_e1zifTH5dZaE@ep-gentle-mouse-ankslyb3-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require");

async function main() {
  const programs = await sql`
    SELECT id, title, href, category FROM academic_programs ORDER BY id;
  `;
  console.log("PROGRAMS IN DB:", programs);
}
main().catch(console.error);
