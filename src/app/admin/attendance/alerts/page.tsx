import { neon } from '@neondatabase/serverless';
import Link from 'next/link';
import { AlertTriangle, Users, BookOpen, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

const sql = neon(process.env.DATABASE_URL || '');

export const revalidate = 0;

export default async function AttendanceAlertsPage() {
  // Query group absenteeism summary
  const groupStatsQuery = await sql`
    SELECT 
      g.id as group_id,
      g.nombre as group_name,
      g.jornada,
      g.tipo,
      COUNT(DISTINCT e.student_id) as total_students,
      COUNT(DISTINCT cs.id) as total_sessions,
      COUNT(ar.id) FILTER (WHERE ar.estado = 'AUSENTE') as total_absences,
      COUNT(ar.id) as total_records
    FROM groups g
    LEFT JOIN enrollments e ON e.group_id = g.id
    LEFT JOIN class_sessions cs ON cs.group_id = g.id
    LEFT JOIN attendance_records_normalized ar ON ar.session_id = cs.id AND ar.student_id = e.student_id
    GROUP BY g.id, g.nombre, g.jornada, g.tipo
    ORDER BY g.nombre ASC
  `;

  // Query high absenteeism students (>15% absence rate)
  const studentAlertsQuery = await sql`
    SELECT 
      s.id as student_id,
      s.nombre_original as student_name,
      g.nombre as group_name,
      g.id as group_id,
      COUNT(ar.id) as total_sessions,
      COUNT(ar.id) FILTER (WHERE ar.estado = 'AUSENTE') as total_absences,
      COUNT(ar.id) FILTER (WHERE ar.estado = 'PRESENTE') as total_presents,
      ROUND(
        (COUNT(ar.id) FILTER (WHERE ar.estado = 'AUSENTE')::numeric / NULLIF(COUNT(ar.id), 0)) * 100, 1
      ) as absence_rate
    FROM students_normalized s
    JOIN enrollments e ON e.student_id = s.id
    JOIN groups g ON g.id = e.group_id
    JOIN class_sessions cs ON cs.group_id = g.id
    JOIN attendance_records_normalized ar ON ar.session_id = cs.id AND ar.student_id = s.id
    WHERE (s.estado IS NULL OR s.estado = 'ACTIVO')
      AND (e.activo IS NULL OR e.activo = TRUE)
      AND NOT EXISTS (
        SELECT 1 FROM students st 
        WHERE st.nombre = s.nombre_original AND st.activo = FALSE
      )
    GROUP BY s.id, s.nombre_original, g.nombre, g.id
    HAVING (COUNT(ar.id) FILTER (WHERE ar.estado = 'AUSENTE')::numeric / NULLIF(COUNT(ar.id), 0)) * 100 > 15
    ORDER BY absence_rate DESC
    LIMIT 100
  `;

  // Multi-enrollment students query
  const multiEnrollmentQuery = await sql`
    SELECT 
      s.id as student_id,
      s.nombre_original as student_name,
      ARRAY_AGG(g.nombre) as groups
    FROM students_normalized s
    JOIN enrollments e ON e.student_id = s.id
    JOIN groups g ON g.id = e.group_id
    GROUP BY s.id, s.nombre_original
    HAVING COUNT(g.id) > 1
    ORDER BY s.nombre_original ASC
  `;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <span className="text-[10px] font-black uppercase text-fsm-blue bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            SISTEMA INTEGRADO DE ASISTENCIA — NORMAS EXCEL MIGRADO
          </span>
          <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tight mt-2">
            TABLERO DE ALERTAS DE AUSENTISMO
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Resumen consolidado por grupo, estudiantes en riesgo (&gt;15% de inasistencia) y multimatrículas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/attendance"
            className="px-4 py-2 bg-white text-fsm-blue border border-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
          >
            ← Volver a Control Diario
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
            <AlertTriangle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estudiantes en Alerta (&gt;15%)</p>
            <p className="text-3xl font-black text-fsm-blue mt-1">{studentAlertsQuery.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-fsm-blue rounded-2xl border border-blue-200">
            <BookOpen size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Grupos Activos</p>
            <p className="text-3xl font-black text-fsm-blue mt-1">{groupStatsQuery.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl border border-purple-200">
            <Users size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estudiantes Multimatriculados</p>
            <p className="text-3xl font-black text-fsm-blue mt-1">{multiEnrollmentQuery.length}</p>
          </div>
        </div>
      </div>

      {/* Section 1: High Absenteeism Student Alerts */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              ESTUDIANTES EN RIESGO POR AUSENTISMO (&gt;15%)
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Estudiantes que superan el umbral crítico de inasistencia no justificada.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                <th className="py-3 px-4">Estudiante</th>
                <th className="py-3 px-4">Grupo</th>
                <th className="py-3 px-4 text-center">Sesiones Evaluadas</th>
                <th className="py-3 px-4 text-center">Inasistencias</th>
                <th className="py-3 px-4 text-center">% Ausentismo</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {studentAlertsQuery.map((row: any) => (
                <tr key={row.student_id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-800">{row.student_name}</td>
                  <td className="py-3 px-4">
                    <span className="bg-blue-50 text-fsm-blue font-bold px-2.5 py-1 rounded-lg border border-blue-200">
                      {row.group_name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-gray-700">{row.total_sessions}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="bg-red-50 text-fsm-red font-black px-2.5 py-1 rounded-lg border border-red-200">
                      {row.total_absences} Faltas
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-black text-amber-600 text-sm">
                    {row.absence_rate}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/attendance/students/${row.student_id}`}
                      className="inline-flex items-center gap-1 text-fsm-blue font-bold hover:underline"
                    >
                      Ver Historial <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Group Summary Cards */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight">
              RESUMEN CONSOLIDADO POR GRUPO / JORNADA
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Indicadores generales de asistencia por cada hoja de grupo migrada del Excel.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupStatsQuery.map((g: any) => {
            const records = Number(g.total_records) || 0;
            const absences = Number(g.total_absences) || 0;
            const rate = records > 0 ? ((absences / records) * 100).toFixed(1) : '0.0';

            return (
              <div key={g.group_id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3 hover:border-blue-300 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-blue-100 text-fsm-blue px-2 py-0.5 rounded">
                      {g.jornada} • {g.tipo}
                    </span>
                    <h3 className="text-lg font-black text-fsm-blue uppercase mt-1">{g.group_name}</h3>
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded-lg border ${
                    Number(rate) > 15 ? 'bg-red-50 text-fsm-red border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                  }`}>
                    {rate}% Ausentismo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-medium pt-2 border-t border-gray-200">
                  <div>
                    <span className="text-gray-400">Estudiantes:</span>
                    <p className="font-bold text-gray-800">{g.total_students}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Sesiones:</span>
                    <p className="font-bold text-gray-800">{g.total_sessions}</p>
                  </div>
                </div>

                <Link
                  href={`/admin/attendance/group/${g.group_id}`}
                  className="block text-center py-2 bg-white text-fsm-blue border border-gray-200 rounded-xl font-bold text-xs uppercase hover:bg-fsm-blue hover:text-white transition-all mt-2"
                >
                  Ver Control por Grupo →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Multi-Enrollment Students */}
      {multiEnrollmentQuery.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight">
              🔀 ESTUDIANTES CON MULTIMATRÍCULA / TRANSFERENCIAS ({multiEnrollmentQuery.length})
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Estudiantes consolidados que figuran en más de un grupo/jornada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {multiEnrollmentQuery.map((m: any) => (
              <div key={m.student_id} className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-2">
                <p className="font-bold text-gray-800 text-xs">{m.student_name}</p>
                <div className="flex flex-wrap gap-1">
                  {m.groups.map((gName: string) => (
                    <span key={gName} className="text-[10px] font-bold bg-white text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                      {gName}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
