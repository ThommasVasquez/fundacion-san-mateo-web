import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Creating tables...");
  
  await sql`
    CREATE TABLE IF NOT EXISTS site_content (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content_key TEXT UNIQUE NOT NULL,
      content_type TEXT NOT NULL, 
      value TEXT NOT NULL,
      page_path TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
  `;
  
  console.log("Tables created successfully.");

  console.log("Creating default admin user...");
  const passwordHash = await bcrypt.hash('Admin123$', 10);
  
  // Upsert the admin user
  await sql`
    INSERT INTO admin_users (email, password_hash)
    VALUES ('admin@fundacionsanmateo.edu.co', ${passwordHash})
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
  `;
  console.log("Admin user 'admin@fundacionsanmateo.edu.co' created. (Password: Admin123$)");

  console.log("Populating initial site content...");

  const initialContent = [
    // Home Hero
    { key: 'home_hero_subtitle', type: 'text', value: 'Excelencia en Educación Superior', path: '/' },
    { key: 'home_hero_title1', type: 'text', value: 'FORJANDO', path: '/' },
    { key: 'home_hero_title_highlight', type: 'text', value: 'FUTUROS', path: '/' },
    { key: 'home_hero_title2', type: 'text', value: 'BRILLANTES', path: '/' },
    { key: 'home_hero_desc', type: 'text', value: 'Institución de educación para el trabajo y desarrollo humano en Soacha, comprometida con la formación integral y la calidad técnica.', path: '/' },
    { key: 'home_hero_image', type: 'image', value: '/img/servicio-al-cliente.jpg', path: '/' },
    
    // About Page (Mision/Vision)
    { key: 'about_mission_title', type: 'text', value: 'Misión', path: '/institucion/acerca-de-fsm' },
    { key: 'about_mission_text', type: 'text', value: 'Formar integralmente a nuestros estudiantes mediante programas técnicos con alto nivel de exigencia y competitividad, orientados por un talento humano idóneo y el mejoramiento continuo institucional.', path: '/institucion/acerca-de-fsm' },
    { key: 'about_vision_title', type: 'text', value: 'Visión', path: '/institucion/acerca-de-fsm' },
    { key: 'about_vision_text', type: 'text', value: 'Ser reconocidos en todo Cundinamarca por la excelencia educativa, compromiso social y el liderazgo en la formación técnica certificada bajo rigurosos sistemas de gestión de calidad.', path: '/institucion/acerca-de-fsm' }
  ];

  for (const item of initialContent) {
    await sql`
      INSERT INTO site_content (content_key, content_type, value, page_path)
      VALUES (${item.key}, ${item.type}, ${item.value}, ${item.path})
      ON CONFLICT (content_key) DO NOTHING;
    `;
  }
  
  console.log("Initial content populated.");
  console.log("Database setup complete!");
}

main().catch(console.error);
