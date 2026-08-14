import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const sql = neon(dbUrl);

async function main() {
  console.log("=== NEON DATABASE INSPECTION ===");
  
  // Get all user tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  
  console.log(`Found ${tables.length} tables in public schema:\n`);

  for (const t of tables) {
    const tableName = t.table_name;
    const countRes = await sql.query(`SELECT COUNT(*)::int as cnt FROM "${tableName}"`);
    const count = countRes[0]?.cnt ?? 0;
    
    const cols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ${tableName} AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    console.log(`--------------------------------------------------`);
    console.log(`TABLE: ${tableName} (${count} rows)`);
    console.log(`--------------------------------------------------`);
    for (const c of cols) {
      console.log(`  - ${c.column_name}: ${c.data_type} (Nullable: ${c.is_nullable}, Default: ${c.column_default || 'NONE'})`);
    }
    console.log("");
  }
}

main().catch(err => {
  console.error("Error inspecting Neon DB:", err);
  process.exit(1);
});
