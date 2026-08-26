import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  const historyStudentId = '6da2bb8d-d78b-43a7-864f-401f2fa60ae1';

  console.log('=== TEST PROBANDO CONSULTA DE historyStudentId EN AMBAS TABLAS ===\n');

  // Querying students table
  const inStudents = await sql`SELECT * FROM students WHERE id = ${historyStudentId}::uuid`;
  console.log('Encontrado en tabla students:', inStudents.length > 0);

  // Querying students_normalized table
  const inNorm = await sql`SELECT * FROM students_normalized WHERE id = ${historyStudentId}::uuid`;
  console.log('Encontrado en tabla students_normalized:', inNorm.length > 0);
  if (inNorm.length > 0) {
    console.table(inNorm);
  }
}

main().catch(console.error);
