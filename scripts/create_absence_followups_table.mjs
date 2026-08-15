import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('Creating absence_followups table in Neon DB...');

  await sql`
    CREATE TABLE IF NOT EXISTS absence_followups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      fecha DATE NOT NULL,
      turno TEXT NOT NULL,
      se_llamo BOOLEAN DEFAULT FALSE,
      estado_llamada TEXT DEFAULT 'pendiente',
      comentarios TEXT,
      excusa_url TEXT,
      registrado_por TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT absence_followups_student_fecha_key UNIQUE (student_id, fecha)
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_absence_followups_fecha_turno ON absence_followups(fecha, turno);
  `;

  console.log('Table absence_followups created successfully.');
}

main().catch(console.error);
