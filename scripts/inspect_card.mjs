import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const tagHex = '5400357EAC';
  
  // Convert 5400357EAC in various byte orders or decimal formats:
  // 1. 54 00 35 7E AC -> bytes: 84, 0, 53, 126, 172
  // Strip version byte 54 -> 00 35 7E AC -> decimal: (0<<24) + (53<<16) + (126<<8) + 172 = 3505836
  // Or full 5 bytes -> (84<<32) + ... or integer parse: parseInt("5400357EAC", 16) = 360781741740
  // Or last 3 bytes: 35 7E AC -> (53<<16) + (126<<8) + 172 = 3505836

  console.log('Searching all students in database for tag or card number...');
  
  const matchesCardNum = await sql`
    SELECT id, nombre, grado, rfid_tag_uid, tarjeta_numero 
    FROM students 
    WHERE tarjeta_numero::text LIKE '%3505836%' 
       OR tarjeta_numero::text LIKE '%357EAC%'
       OR rfid_tag_uid ILIKE '%5400357EAC%'
  `;
  console.log('Matches in students table:', matchesCardNum);

  const events = await sql`
    SELECT ae.id, ae.student_id, ae.rfid_tag_uid, ae.timestamp, s.nombre 
    FROM attendance_events ae
    LEFT JOIN students s ON ae.student_id = s.id
    WHERE ae.rfid_tag_uid ILIKE '%5400357EAC%'
    ORDER BY ae.timestamp DESC
    LIMIT 5
  `;
  console.log('Attendance events for 5400357EAC:', events);
}

main().catch(console.error);
