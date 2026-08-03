import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Starting attendance system schema migration...");

  // 1. Create teachers table
  console.log("Creating 'teachers' table...");
  await sql`
    CREATE TABLE IF NOT EXISTS teachers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 2. Create students table
  console.log("Creating 'students' table...");
  await sql`
    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre TEXT NOT NULL,
      rfid_tag_uid TEXT UNIQUE,
      grado TEXT NOT NULL,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 3. Create readers table
  console.log("Creating 'readers' table...");
  await sql`
    CREATE TABLE IF NOT EXISTS readers (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL CHECK (tipo IN ('fixed_panel', 'mobile_nfc')),
      ubicacion TEXT NOT NULL,
      device_id TEXT UNIQUE,
      teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL
    );
  `;

  // 4. Create attendance_events table
  console.log("Creating 'attendance_events' table...");
  await sql`
    CREATE TABLE IF NOT EXISTS attendance_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      rfid_tag_uid TEXT NOT NULL,
      reader_id TEXT REFERENCES readers(id) ON DELETE CASCADE,
      tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('entrada', 'salida')),
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      origen TEXT NOT NULL CHECK (origen IN ('panel', 'movil_profesor')),
      sincronizado BOOLEAN DEFAULT TRUE,
      geolocalizacion TEXT,
      registrado_por UUID
    );
  `;

  console.log("Tables created successfully.");

  // 5. Seeding default data
  console.log("Seeding default teacher...");
  const teacherPasswordHash = await bcrypt.hash('Profesor123$', 10);
  
  // Insert teacher and return ID
  const seededTeachers = await sql`
    INSERT INTO teachers (nombre, email, password_hash)
    VALUES ('Profesor de Prácticas', 'teacher@fundacionsanmateo.edu.co', ${teacherPasswordHash})
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id;
  `;
  const teacherId = seededTeachers[0].id;
  console.log(`Teacher seeded with ID: ${teacherId}`);

  console.log("Seeding default students...");
  await sql`
    INSERT INTO students (nombre, rfid_tag_uid, grado, activo)
    VALUES 
      ('Carlos Gómez', '04A2B3C4', '10A', TRUE),
      ('María Rodríguez', '12D3E4F5', '11B', TRUE),
      ('Juan Pérez', NULL, '10A', TRUE)
    ON CONFLICT (rfid_tag_uid) DO NOTHING;
  `;

  console.log("Seeding default readers...");
  await sql`
    INSERT INTO readers (id, tipo, ubicacion, device_id, teacher_id)
    VALUES 
      ('panel-001', 'fixed_panel', 'Entrada Principal', 'ESP32-ENTRADA', NULL),
      ('movil-001', 'mobile_nfc', 'Prácticas Externas', 'NFC-MOVIL-01', ${teacherId})
    ON CONFLICT (id) DO NOTHING;
  `;

  console.log("Attendance system database setup complete!");
}

main().catch(console.error);
