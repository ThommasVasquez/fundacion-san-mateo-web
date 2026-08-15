import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('Updating readers_tipo_check constraint...');

  await sql`ALTER TABLE readers DROP CONSTRAINT IF EXISTS readers_tipo_check;`;
  await sql`ALTER TABLE readers ADD CONSTRAINT readers_tipo_check CHECK (tipo IN ('fixed_panel', 'mobile_nfc', 'manual_web'));`;

  await sql`
    INSERT INTO readers (id, tipo, ubicacion, device_id)
    VALUES ('manual-web', 'manual_web', 'Entrada Manual Secretaría', 'MANUAL-WEB')
    ON CONFLICT (id) DO NOTHING;
  `;

  console.log('Reader manual-web added successfully to readers table.');
}

main().catch(console.error);
