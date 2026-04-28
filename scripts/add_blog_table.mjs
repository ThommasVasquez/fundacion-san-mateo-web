import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Creating blog_posts table...");
  
  await sql`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL,
      image_base64 TEXT,
      author TEXT DEFAULT 'Fundación San Mateo',
      published BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  console.log("blog_posts table created successfully.");
}

main().catch(console.error);
