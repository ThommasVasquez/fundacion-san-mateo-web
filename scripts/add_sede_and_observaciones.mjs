import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== APLICANDO MIGRACIÓN: AGREGAR COLUMNAS SEDE Y OBSERVACIONES ===');

  await sql`
    ALTER TABLE attendance_events 
    ADD COLUMN IF NOT EXISTS sede TEXT DEFAULT 'Sede Principal Soacha',
    ADD COLUMN IF NOT EXISTS observaciones TEXT DEFAULT NULL;
  `;

  console.log('Columnas `sede` y `observaciones` agregadas correctamente a `attendance_events`.');

  // Verify updated schema
  const cols = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns 
    WHERE table_name = 'attendance_events'
    ORDER BY ordinal_position;
  `;
  console.table(cols);
}

main().catch(console.error);
