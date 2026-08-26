import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  console.log('=== BUSCANDO ESTUDIANTES CON INASISTENCIAS REALES REGISTRADAS ===\n');

  // Query top students with real AUSENTE records in attendance_records_normalized
  const topAbsents = await sql`
    SELECT 
      s.id as student_id,
      s.nombre_original as student_name,
      g.nombre as group_name,
      COUNT(ar.id) FILTER (WHERE ar.estado = 'AUSENTE') as inasistencias_totales,
      COUNT(ar.id) FILTER (WHERE ar.estado = 'PRESENTE') as asistencias_totales,
      COUNT(ar.id) as total_evaluados
    FROM students_normalized s
    JOIN attendance_records_normalized ar ON ar.student_id = s.id
    JOIN class_sessions cs ON cs.id = ar.session_id
    JOIN groups g ON g.id = cs.group_id
    GROUP BY s.id, s.nombre_original, g.nombre
    HAVING COUNT(ar.id) FILTER (WHERE ar.estado = 'AUSENTE') > 0
    ORDER BY inasistencias_totales DESC
    LIMIT 20
  `;

  console.table(topAbsents);
}

main().catch(console.error);
