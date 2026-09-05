import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

// Función de festivos colombianos simplificada para el script
function isColombiaHolidayDate(dateStr) {
  const holidays2026 = [
    '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03',
    '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29',
    '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02',
    '2026-11-16', '2026-12-08', '2026-12-25'
  ];
  return holidays2026.includes(dateStr);
}

async function run() {
  console.log('🚀 Iniciando sincronización de inasistencias reales (agosto - septiembre 2026)...');

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  console.log(`📅 Fecha actual Bogotá: ${todayStr}`);

  // 1. Obtener todos los escaneos reales por estudiante y fecha
  const scansRes = await sql`
    SELECT 
      sn.id as student_id,
      (ae.timestamp AT TIME ZONE 'America/Bogota')::date::text as fecha_bogota
    FROM attendance_events ae
    LEFT JOIN students s ON s.id = ae.student_id
    LEFT JOIN students_normalized sn ON sn.id = ae.student_id 
      OR UPPER(REGEXP_REPLACE(TRIM(sn.nombre_original), '\\s+', ' ', 'g')) = UPPER(REGEXP_REPLACE(TRIM(s.nombre), '\\s+', ' ', 'g'))
    WHERE sn.id IS NOT NULL
    GROUP BY sn.id, (ae.timestamp AT TIME ZONE 'America/Bogota')::date::text
  `;

  console.log(`✅ Escaneos únicos (estudiante x fecha) encontrados: ${scansRes.length}`);
  const scanSet = new Set();
  scansRes.forEach(r => {
    scanSet.add(`${r.student_id}_${r.fecha_bogota}`);
  });

  // 2. Obtener sesiones de clase pasadas hasta hoy
  // Foco en el periodo activo donde hay control de asistencia (desde 2026-08-01 hasta hoy)
  const sessionsRes = await sql`
    SELECT 
      ar.id as record_id,
      ar.student_id,
      cs.fecha::text as fecha,
      ar.estado,
      ar.observaciones,
      g.nombre as grupo_nombre,
      g.jornada
    FROM attendance_records_normalized ar
    JOIN class_sessions cs ON cs.id = ar.session_id
    JOIN groups g ON g.id = cs.group_id
    WHERE cs.fecha >= '2026-08-01'::date
      AND cs.fecha <= ${todayStr}::date
  `;

  console.log(`📊 Total registros evaluados en periodo lectivo activo (agosto-septiembre): ${sessionsRes.length}`);

  let updatedToAbsent = 0;
  let confirmedPresent = 0;
  let preservedSpecial = 0;

  const idsToMarkAbsent = [];
  const idsToMarkPresent = [];

  for (const row of sessionsRes) {
    const isHoliday = isColombiaHolidayDate(row.fecha);
    const hasScan = scanSet.has(`${row.student_id}_${row.fecha}`);
    const isCB = (row.grupo_nombre || '').toUpperCase().includes('CB');

    // Si tiene justificación médica, comité, prácticas, etc. O nota escrita manual -> PRESERVAR
    const isSpecial = ['EXCUSA_MEDICA', 'PRACTICAS', 'COMITE_ACADEMICO', 'LIBRE', 'CONGELADO', 'TERMINACION_DE_SEMESTRE'].includes(row.estado)
      || (row.observaciones && row.observaciones.trim().length > 0 && row.estado !== 'PRESENTE');

    if (isSpecial) {
      preservedSpecial++;
      continue;
    }

    if (isHoliday) {
      continue; // Festivos se dejan o se marcan festivos
    }

    if (isCB && row.fecha < '2026-09-01') {
      continue; // Calendario B inicia en septiembre
    }

    if (hasScan) {
      if (row.estado !== 'PRESENTE') {
        idsToMarkPresent.push(row.record_id);
      }
      confirmedPresent++;
    } else {
      // NO HUBO ESCANEO EN FECHA DE CLASE PASADA -> ES AUSENTE (FALLA REAL)
      if (row.estado === 'PRESENTE') {
        idsToMarkAbsent.push(row.record_id);
        updatedToAbsent++;
      }
    }
  }

  console.log(`📈 Análisis completado:`);
  console.log(`   - Preservados especiales (excusas/prácticas/comités): ${preservedSpecial}`);
  console.log(`   - Confirmados PRESENTES con escaneo: ${confirmedPresent}`);
  console.log(`   - A actualizar a AUSENTE (fallas no marcadas): ${idsToMarkAbsent.length}`);
  console.log(`   - A asegurar como PRESENTE con escaneo: ${idsToMarkPresent.length}`);

  // Actualizar en lotes
  if (idsToMarkAbsent.length > 0) {
    console.log('⏳ Aplicando actualización de inasistencias en base de datos...');
    const BATCH_SIZE = 500;
    for (let i = 0; i < idsToMarkAbsent.length; i += BATCH_SIZE) {
      const batch = idsToMarkAbsent.slice(i, i + BATCH_SIZE);
      await sql`
        UPDATE attendance_records_normalized
        SET estado = 'AUSENTE', updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY(${batch}::uuid[])
      `;
      process.stdout.write(`   Actualizados ${Math.min(i + BATCH_SIZE, idsToMarkAbsent.length)} / ${idsToMarkAbsent.length}\r`);
    }
    console.log('\n✅ Inasistencias reales actualizadas con éxito.');
  }

  if (idsToMarkPresent.length > 0) {
    console.log('⏳ Asegurando asistencias con escaneo verificado...');
    const BATCH_SIZE = 500;
    for (let i = 0; i < idsToMarkPresent.length; i += BATCH_SIZE) {
      const batch = idsToMarkPresent.slice(i, i + BATCH_SIZE);
      await sql`
        UPDATE attendance_records_normalized
        SET estado = 'PRESENTE', updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY(${batch}::uuid[])
      `;
    }
    console.log('✅ Asistencias con escaneo confirmadas con éxito.');
  }

  console.log('🎉 Sincronización finalizada satisfactoriamente.');
}

run().catch(err => {
  console.error('❌ Error en script de sincronización:', err);
  process.exit(1);
});
