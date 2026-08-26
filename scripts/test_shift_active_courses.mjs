import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-26';

  console.log(`=== AUDITORÍA DE CURSOS Y TURNOS PARA ${dateStr} ===`);

  // All active students and their courses
  const students = await sql`
    SELECT 
      s.id,
      s.grado,
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado,
      ae.id as event_id
    FROM students s
    LEFT JOIN attendance_events ae 
      ON s.id = ae.student_id 
     AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE;
  `;

  // Courses that scanned today
  const scannedGrados = Array.from(new Set(students.filter(s => s.event_id !== null).map(s => s.grado)));
  console.log('Todos los cursos que tuvieron al menos 1 marcación hoy:', scannedGrados);

  // Group by shift
  const diurnoScanned = scannedGrados.filter(g => !g.toUpperCase().includes('NOCHE') && !g.toUpperCase().includes('SABADO'));
  const nocheScanned = scannedGrados.filter(g => g.toUpperCase().includes('NOCHE'));
  const sabadoScanned = scannedGrados.filter(g => g.toUpperCase().includes('SABADO'));

  console.log('Cursos Diurnos que han escaneado hoy:', diurnoScanned);
  console.log('Cursos Noche que han escaneado hoy:', nocheScanned);
  console.log('Cursos Sábado que han escaneado hoy:', sabadoScanned);
}

main().catch(console.error);
