import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  const filterStartDate = '2026-08-01';
  const filterEndDate = '2026-08-26';
  const filterGrado = '';
  const filterSearch = 'CHIVATA';

  console.log('=== PROBANDO QUERY DE SOLO INASISTENCIAS REALES ===\n');

  const absences = await sql`
    SELECT 
      ar.id,
      ar.student_id,
      s.nombre_original as student_name,
      g.nombre as student_grado,
      'MANUAL' as origen,
      'inasistencia' as tipo_evento,
      cs.fecha as timestamp,
      ar.sede,
      ar.observaciones,
      ar.estado
    FROM attendance_records_normalized ar
    JOIN class_sessions cs ON cs.id = ar.session_id
    JOIN students_normalized s ON s.id = ar.student_id
    JOIN groups g ON g.id = cs.group_id
    WHERE ar.estado = 'AUSENTE'
      AND cs.fecha >= ${filterStartDate}::date
      AND cs.fecha <= ${filterEndDate}::date
      ${filterGrado ? sql`AND g.nombre = ${filterGrado}` : sql``}
      ${filterSearch ? sql`AND (s.nombre_original ILIKE ${'%' + filterSearch + '%'} OR s.nombre_normalizado ILIKE ${'%' + filterSearch + '%'})` : sql``}
    ORDER BY cs.fecha DESC, s.nombre_original ASC
  `;

  console.log(`Encontradas ${absences.length} inasistencias reales:`);
  console.table(absences);
}

main().catch(console.error);
