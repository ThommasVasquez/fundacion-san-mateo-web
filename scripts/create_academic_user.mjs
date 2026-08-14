import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('Ensuring role column exists in admin_users...');
  await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';`;

  console.log('Hashing password for sacademica...');
  const hash = await bcrypt.hash('Academica2026%', 10);

  console.log('Upserting user sacademica@fundacionsanmateosoacha.edu.co...');
  await sql`
    INSERT INTO admin_users (email, password_hash, role)
    VALUES ('sacademica@fundacionsanmateosoacha.edu.co', ${hash}, 'academic')
    ON CONFLICT (email) DO UPDATE SET 
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role;
  `;

  console.log('User sacademica@fundacionsanmateosoacha.edu.co created/updated successfully with role = academic.');
}

main().catch(console.error);
