import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  const cols = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'readers'
  `;
  console.log('Columnas de la tabla `readers`:');
  console.table(cols);
}

main().catch(console.error);
