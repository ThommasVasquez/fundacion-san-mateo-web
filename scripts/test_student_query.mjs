import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  const studentId = '2433599a-88ba-49f6-9011-bec95b5a286d';

  try {
    const studentQuery = await sql`
      SELECT id, nombre_original, nombre_normalizado, documento, estado
      FROM students_normalized
      WHERE id = ${studentId}::uuid
      UNION
      SELECT id, nombre as nombre_original, nombre as nombre_normalizado, documento, 'ACTIVO' as estado
      FROM students
      WHERE id = ${studentId}::uuid
      LIMIT 1
    `;
    console.log('Query succeeded:', studentQuery);
  } catch (err) {
    console.error('Query failed:', err.message);
  }
}

main();
