import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  const startDate = '2026-08-01';
  const endDate = '2026-08-26';

  console.log(`=== VERIFICANDO INASISTENCIAS REALES EN RANGO ${startDate} A ${endDate} ===\n`);

  // Query absences from attendance_records_normalized
  const recordedAbsences = await sql`
    SELECT 
      ar.id,
      ar.student_id,
      s.nombre_original as student_name,
      g.nombre as student_grado,
      ar.estado,
      ar.fuente,
      ar.observaciones,
      ar.sede,
      cs.fecha,
      cs.dia_semana_texto
    FROM attendance_records_normalized ar
    JOIN class_sessions cs ON cs.id = ar.session_id
    JOIN students_normalized s ON s.id = ar.student_id
    JOIN groups g ON g.id = cs.group_id
    WHERE ar.estado = 'AUSENTE'
      AND cs.fecha >= ${startDate}::date
      AND cs.fecha <= ${endDate}::date
    ORDER BY cs.fecha DESC, s.nombre_original ASC
    LIMIT 20
  `;

  console.log(`Total inasistencias registradas en attendance_records_normalized: ${recordedAbsences.length} muestreadas`);
  console.table(recordedAbsences);

  const totalAbsencesCount = await sql`
    SELECT count(*)
    FROM attendance_records_normalized ar
    JOIN class_sessions cs ON cs.id = ar.session_id
    WHERE ar.estado = 'AUSENTE'
      AND cs.fecha >= ${startDate}::date
      AND cs.fecha <= ${endDate}::date
  `;
  console.log(`\nCOUNT TOTAL DE INASISTENCIAS EN ESE RANGO EN DB: ${totalAbsencesCount[0].count}`);
}

main().catch(console.error);
