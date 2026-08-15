import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('Adding manual-web reader to readers table...');

  await sql`
    INSERT INTO readers (id, tipo, ubicacion, device_id)
    VALUES ('manual-web', 'manual_web', 'Registro Manual Secretaría', 'MANUAL-WEB')
    ON CONFLICT (id) DO NOTHING;
  `;

  console.log('Reader manual-web added successfully.');
}

main().catch(console.error);
