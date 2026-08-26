import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function getAbsentsForDate(dateStr, targetShift = 'AUTO') {
  const eventCountRes = await sql`
    SELECT COUNT(*)::int as count
    FROM attendance_events
    WHERE DATE(timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
  `;
  const totalScans = eventCountRes[0]?.count || 0;

  const dateObj = new Date(`${dateStr}T12:00:00-05:00`);
  const dayOfWeek = dateObj.getDay();
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

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

  const validRows = rows.filter((r) => {
    if (isWeekday) {
      return r.turno_calculado === 'DIURNO' || r.turno_calculado === 'NOCHE';
    } else if (isSaturday) {
      return r.turno_calculado === 'SABADO';
    } else {
      return false;
    }
  });

  let filtered = validRows;
  if (targetShift && targetShift !== 'ALL' && targetShift !== 'AUTO') {
    filtered = validRows.filter((r) => r.turno_calculado === targetShift);
  }

  const byShift = { DIURNO: 0, NOCHE: 0, SABADO: 0 };
  filtered.forEach(r => byShift[r.turno_calculado]++);

  return {
    date: dateStr,
    dayOfWeek: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayOfWeek],
    totalScans,
    totalAbsent: filtered.length,
    byShift
  };
}

async function main() {
  const dates = [
    '2026-08-26', '2026-08-25', '2026-08-24', '2026-08-23', 
    '2026-08-22', '2026-08-21', '2026-08-20', '2026-08-19', 
    '2026-08-18', '2026-08-17', '2026-08-16', '2026-08-15'
  ];

  console.log('=== AUDITORÍA DE REPORTES DE AUSENCIAS POR FECHA ===');
  const results = [];
  for (const d of dates) {
    results.push(await getAbsentsForDate(d, 'ALL'));
  }
  console.table(results.map(r => ({
    Fecha: r.date,
    Día: r.dayOfWeek,
    'Escaneos Hoy': r.totalScans,
    'Total Inasistentes': r.totalAbsent,
    'Diurno (Faltaron)': r.byShift.DIURNO,
    'Noche (Faltaron)': r.byShift.NOCHE,
    'Sábado (Faltaron)': r.byShift.SABADO,
  })));
}

main().catch(console.error);
