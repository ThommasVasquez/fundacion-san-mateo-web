import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== ACTUALIZANDO NOMBRES DE SEDES A SEDE 1 Y SEDE 2 ===');

  // Update table column default
  await sql`
    ALTER TABLE attendance_events 
    ALTER COLUMN sede SET DEFAULT 'Sede 1';
  `;

  // Update existing rows
  await sql`
    UPDATE attendance_events
    SET sede = 'Sede 1'
    WHERE sede IS NULL 
       OR sede LIKE '%Principal%' 
       OR sede LIKE '%Soacha%' 
       OR sede LIKE '%Centro%' 
       OR sede LIKE '%Norte%';
  `;

  console.log('Base de datos actualizada con default `Sede 1`.');

  const countBySede = await sql`
    SELECT sede, COUNT(*)::int as total
    FROM attendance_events
    GROUP BY sede;
  `;
  console.table(countBySede);
}

main().catch(console.error);
