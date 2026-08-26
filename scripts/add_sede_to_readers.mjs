import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  console.log('=== AÑADIENDO COLUMNA SEDE A TABLA READERS EN NEON POSTGRES ===\n');

  await sql`
    ALTER TABLE readers
    ADD COLUMN IF NOT EXISTS sede TEXT DEFAULT 'Sede 1';
  `;

  // Update panel-001 to Sede 1
  await sql`
    UPDATE readers
    SET sede = 'Sede 1'
    WHERE id = 'panel-001';
  `;

  // Ensure panel-002 exists for Sede 2 if hardware is installed there
  await sql`
    INSERT INTO readers (id, tipo, ubicacion, device_id, sede)
    VALUES ('panel-002', 'fixed_panel', 'Entrada Principal Sede 2', 'ESP32-SEDE2', 'Sede 2')
    ON CONFLICT (id) DO UPDATE SET sede = 'Sede 2';
  `;

  const updatedReaders = await sql`SELECT * FROM readers`;
  console.log('Lectores configurados con Sede:');
  console.table(updatedReaders);
}

main().catch(console.error);
