import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('Creating issued_documents table in Neon Postgres...');

  await sql`
    CREATE TABLE IF NOT EXISTS issued_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      consecutivo TEXT UNIQUE NOT NULL,
      student_nombre TEXT NOT NULL,
      student_documento TEXT,
      tipo_documento TEXT NOT NULL,
      programa_curso TEXT NOT NULL,
      fecha_expedicion DATE NOT NULL DEFAULT CURRENT_DATE,
      folio TEXT,
      libro TEXT,
      estado TEXT NOT NULL DEFAULT 'valido',
      notas TEXT,
      pdf_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_issued_documents_consecutivo ON issued_documents(consecutivo);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_issued_documents_documento ON issued_documents(student_documento);`;

  console.log('Table issued_documents and indexes created successfully.');
}

main().catch(console.error);
