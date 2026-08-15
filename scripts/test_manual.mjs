import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('Testing manual entry insertion in DB...');
  const student = (await sql`SELECT id, nombre, rfid_tag_uid FROM students WHERE activo = TRUE LIMIT 1`)[0];
  
  const tagUid = student.rfid_tag_uid || 'MANUAL';

  const res = await sql`
    INSERT INTO attendance_events (
      student_id, rfid_tag_uid, reader_id, tipo_evento, timestamp, origen, sincronizado
    ) VALUES (
      ${student.id}::uuid, ${tagUid}, 'manual-web', 'entrada', CURRENT_TIMESTAMP, 'manual', true
    )
    RETURNING id, student_id, origen, timestamp;
  `;

  console.log('Manual insertion SUCCESSFUL:', res);
}

main().catch(console.error);
