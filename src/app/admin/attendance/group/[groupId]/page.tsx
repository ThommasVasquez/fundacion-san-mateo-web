import { neon } from '@neondatabase/serverless';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Users, Calendar, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

const sql = neon(process.env.DATABASE_URL || '');

export const revalidate = 0;

export default async function GroupAttendancePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  // Query group details
  const groupQuery = await sql`
    SELECT id, nombre, jornada, tipo
    FROM groups
    WHERE id = ${groupId}::uuid
    LIMIT 1
  `;

  if (groupQuery.length === 0) {
    notFound();
  }

  const group = groupQuery[0];

  // Query students in group
  const studentsQuery = await sql`
    SELECT s.id as student_id, s.nombre_original, s.nombre_normalizado
    FROM students_normalized s
    JOIN enrollments e ON e.student_id = s.id
    WHERE e.group_id = ${groupId}::uuid
    ORDER BY s.nombre_original ASC
  `;

  // Query recent sessions for this group
  const sessionsQuery = await sql`
    SELECT cs.id as session_id, cs.fecha, cs.dia_semana_texto,
           COUNT(ar.id) FILTER (WHERE ar.estado = 'PRESENTE') as total_presents,
           COUNT(ar.id) FILTER (WHERE ar.estado = 'AUSENTE') as total_absents
    FROM class_sessions cs
    LEFT JOIN attendance_records_normalized ar ON ar.session_id = cs.id
    WHERE cs.group_id = ${groupId}::uuid
    GROUP BY cs.id, cs.fecha, cs.dia_semana_texto
    ORDER BY cs.fecha DESC
    LIMIT 30
  `;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <Link
            href="/admin/attendance/alerts"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-fsm-blue mb-2 transition-colors uppercase"
          >
            <ArrowLeft size={14} /> Volver a Alertas por Grupo
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <div className="p-3 bg-blue-50 text-fsm-blue rounded-2xl border border-blue-200">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-fsm-blue uppercase tracking-tight">
                GRUPO: {group.nombre}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Jornada {group.jornada} • Tipo {group.tipo}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-xl border border-emerald-200 text-xs">
            👥 {studentsQuery.length} Estudiantes Matriculados
          </span>
        </div>
      </div>

      {/* Class Sessions List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight flex items-center gap-2">
            <Calendar size={20} className="text-fsm-blue" />
            SESIONES DE CLASE REGISTRADAS ({sessionsQuery.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessionsQuery.map((s: any) => {
            const dateObj = new Date(s.fecha);
            const fechaStr = dateObj.toISOString().split('T')[0];

            return (
              <div key={s.session_id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-fsm-blue">{fechaStr}</span>
                  <span className="text-[10px] font-bold bg-blue-100 text-fsm-blue px-2 py-0.5 rounded">
                    {s.dia_semana_texto || 'CLASE'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-gray-200">
                  <span className="text-green-700 flex items-center gap-1">
                    <CheckCircle2 size={14} /> {s.total_presents} Asistieron
                  </span>
                  <span className="text-fsm-red flex items-center gap-1">
                    <XCircle size={14} /> {s.total_absents} Faltaron
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enrolled Students Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight flex items-center gap-2">
            <Users size={20} className="text-fsm-blue" />
            ESTUDIANTES DEL GRUPO ({studentsQuery.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Nombre Completo Estudiante</th>
                <th className="py-3 px-4 text-right">Historial Completo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {studentsQuery.map((st: any, idx: number) => (
                <tr key={st.student_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-gray-800">{st.nombre_original}</td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/attendance/students/${st.student_id}`}
                      className="text-fsm-blue font-bold hover:underline"
                    >
                      Ver Asistencia Individual →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
