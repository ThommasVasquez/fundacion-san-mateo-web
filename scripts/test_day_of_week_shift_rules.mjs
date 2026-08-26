import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const dateStr = '2026-08-26'; // Wednesday
  const dateObj = new Date(`${dateStr}T12:00:00-05:00`);
  const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 3 = Wed, 6 = Sat

  console.log(`Fecha: ${dateStr} | Día de la Semana: ${dayOfWeek} (0=Dom, 3=Mié, 6=Sáb)`);

  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  console.log(`Es Día entre Semana (Lun-Vie): ${isWeekday}`);
  console.log(`Es Sábado: ${isSaturday}`);
  console.log(`Es Domingo: ${isSunday}`);

  // Fetch all active absent students for dateStr
  const rows = await sql`
    SELECT 
      s.id as student_id,
      s.nombre,
      s.grado,
      CASE 
        WHEN UPPER(s.grado) LIKE '%NOCHE%' THEN 'NOCHE'
        WHEN UPPER(s.grado) LIKE '%SABADO%' OR UPPER(s.grado) LIKE '%SB%' THEN 'SABADO'
        ELSE 'DIURNO'
      END as turno_calculado
    FROM students s
    LEFT JOIN attendance_events ae ON s.id = ae.student_id AND DATE(ae.timestamp AT TIME ZONE 'America/Bogota') = ${dateStr}::date
    WHERE s.activo = TRUE
      AND ae.id IS NULL;
  `;

  console.log('\n--- EVALUACIÓN CON REGLAS DE DÍA DE LA SEMANA ---');

  // Rule 1: On Weekdays (Mon-Fri), SABADO students have NO CLASS, so they are NOT absent.
  // Rule 2: On Saturdays, DIURNO and NOCHE students have NO CLASS, so they are NOT absent.
  // Rule 3: On Sundays, NO ONE has class.

  const validAbsentsOnWednesday = rows.filter(r => {
    if (isWeekday) {
      // Weekdays: Only DIURNO and NOCHE attend
      return r.turno_calculado === 'DIURNO' || r.turno_calculado === 'NOCHE';
    } else if (isSaturday) {
      // Saturdays: Only SABADO attends
      return r.turno_calculado === 'SABADO';
    } else {
      // Sundays: No classes
      return false;
    }
  });

  console.log(`Total inasistentes en BD sin filtro de día: ${rows.length}`);
  console.log(`Total inasistentes VÁLIDOS el Miércoles ${dateStr}: ${validAbsentsOnWednesday.length}`);

  const byShift = { DIURNO: 0, NOCHE: 0, SABADO: 0 };
  validAbsentsOnWednesday.forEach(r => {
    byShift[r.turno_calculado]++;
  });

  console.log('Inasistentes válidos por turno el Miércoles:', byShift);
}

main().catch(console.error);
