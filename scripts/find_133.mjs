import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-26';

  console.log(`=== BÚSQUEDA DE LA CIFRA 133 EN FECHA ${dateStr} ===`);

  // 1. All active students without attendance today
  const rows = await sql`
    SELECT 
      s.id as student_id,
      s.nombre,
      s.grado,
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado,
      ae.id as event_id
    FROM students s
    LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE
      AND ae.id IS NULL
  `;

  console.log(`Total sin marcación hoy sin ningún filtro: ${rows.length}`);

  // Count by shift
  const diurno = rows.filter(r => r.turno_calculado === 'DIURNO');
  const noche = rows.filter(r => r.turno_calculado === 'NOCHE');
  const sabado = rows.filter(r => r.turno_calculado === 'SABADO');

  console.log(`- DIURNO total sin marcación: ${diurno.length}`);
  console.log(`- NOCHE total sin marcación: ${noche.length}`);
  console.log(`- SABADO total sin marcación: ${sabado.length}`);

  // Courses that scanned today
  const activeCoursesRes = await sql`
    SELECT DISTINCT s.grado
    FROM attendance_events ae
    JOIN students s ON ae.student_id = s.id
    WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date;
  `;
  const activeCoursesScanned = activeCoursesRes.map(r => r.grado);
  console.log('\nCursos con escaneos hoy:', activeCoursesScanned);

  // If onlyActiveCoursesToday is applied for DIURNO:
  const diurnoActiveCoursesAbsents = diurno.filter(s => activeCoursesScanned.includes(s.grado));
  console.log(`- DIURNO en cursos escaneados hoy: ${diurnoActiveCoursesAbsents.length}`);

  // If onlyActiveCoursesToday is NOT applied for DIURNO (all Diurno courses):
  console.log(`- DIURNO en TODOS los cursos diurnos: ${diurno.length}`);

  // What about SABADO on Saturday?
  const satDateStr = '2026-08-22';
  const satRows = await sql`
    SELECT COUNT(*)::int as count
    FROM students s
    LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${satDateStr}::date
    WHERE s.activo = TRUE
      AND ae.id IS NULL
      AND (UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%');
  `;
  console.log(`- SABADO en sábado 2026-08-22: ${satRows[0].count}`);

  // Check if 133 is Diurno total minus scanned or something else
  console.log('\n--- VERIFICACIÓN DE COMBINACIONES QUE DÉN 133 ---');
  // Check per grade
  const diurnoByGrade = {};
  diurno.forEach(r => diurnoByGrade[r.grado] = (diurnoByGrade[r.grado] || 0) + 1);
  console.log('Diurno inasistentes por curso:', diurnoByGrade);
}

main().catch(console.error);
