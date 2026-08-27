import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  const filterStartDate = '2026-08-01';
  const filterEndDate = '2026-08-26';

  const absencesCountRes = await sql`
    SELECT count(*) as count
    FROM attendance_records_normalized ar
    JOIN class_sessions cs ON cs.id = ar.session_id
    JOIN students_normalized s ON s.id = ar.student_id
    LEFT JOIN enrollments e ON e.student_id = s.id
    LEFT JOIN groups g ON g.id = e.group_id
    WHERE ar.estado = 'AUSENTE'
      AND cs.fecha >= ${filterStartDate}::date
      AND cs.fecha <= ${filterEndDate}::date
  `;
  
  console.log('Count de inasistencias reales entre', filterStartDate, 'y', filterEndDate, ':', absencesCountRes[0]?.count);
}

main().catch(console.error);
