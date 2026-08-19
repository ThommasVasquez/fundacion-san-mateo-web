import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-18';

  console.log(`=== AUDITORÍA MATEMÁTICA DE ASISTENCIA (${dateStr}) ===`);

  // 1. Total attendance events today
  const totalEvents = await sql`
    SELECT COUNT(*)::int as count FROM attendance_events 
    WHERE DATE(timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date;
  `;
  console.log('1. Total lecturas/eventos en tabla attendance_events hoy:', totalEvents[0].count);

  // 2. Distinct students who scanned today
  const distinctScanned = await sql`
    SELECT COUNT(DISTINCT student_id)::int as count FROM attendance_events 
    WHERE DATE(timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date AND student_id IS NOT NULL;
  `;
  console.log('2. Total estudiantes ÚNICOS que marcaron hoy (Entrada/Salida):', distinctScanned[0].count);

  // 3. Breakdown of scanned students by shift
  const scannedByShift = await sql`
    SELECT 
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno,
      COUNT(DISTINCT s.id)::int as asistieron
    FROM attendance_events ae
    JOIN students s ON ae.student_id = s.id
    WHERE DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    GROUP BY turno;
  `;
  console.log('3. Estudiantes que asistieron por turno hoy:', scannedByShift);

  // 4. Total active students by shift in DB
  const totalActiveByShift = await sql`
    SELECT 
      CASE 
        WHEN UPPER(grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(grado) LIKE '%SABADO%' OR UPPER(grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno,
      COUNT(*)::int as matriculados
    FROM students
    WHERE activo = TRUE
    GROUP BY turno;
  `;
  console.log('4. Total estudiantes activos matriculados en BD por turno:', totalActiveByShift);

  // 5. Unscanned (absent) calculation
  const unscannedDiurno = 313 - 99;
  const unscannedNoche = 101 - 39;
  const totalUnscannedWeekday = unscannedDiurno + unscannedNoche;

  console.log('\n--- CÁLCULO EXACTO ---');
  console.log(`- Matrícula Activa Diurno: 313 -> Asistieron: 99 -> Faltaron por marcar: ${unscannedDiurno}`);
  console.log(`- Matrícula Activa Noche:  101 -> Asistieron: 39 -> Faltaron por marcar: ${unscannedNoche}`);
  console.log(`- SUMA TOTAL SIN MARCACIÓN (Diurno + Noche): ${unscannedDiurno} + ${unscannedNoche} = ${totalUnscannedWeekday}`);
}

main().catch(console.error);
