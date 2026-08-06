const { neon } = require('@neondatabase/serverless');

const sql = neon("postgresql://neondb_owner:npg_e1zifTH5dZaE@ep-gentle-mouse-ankslyb3-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function run() {
  try {
    const results = await sql`
      SELECT id, title, category_key, file_name, external_link, length(file_base64) as base64_len, created_at
      FROM normativity_documents
      ORDER BY created_at DESC
      LIMIT 5
    `;
    console.log("Latest Documents:", results);
  } catch (error) {
    console.error("Query error:", error);
  }
}

run();
