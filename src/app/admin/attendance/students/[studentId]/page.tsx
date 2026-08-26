import { neon } from '@neondatabase/serverless';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { User, Calendar, CheckCircle, XCircle, AlertCircle, ArrowLeft, Filter } from 'lucide-react';

const sql = neon(process.env.DATABASE_URL || '');

export const revalidate = 0;

export default async function StudentAttendanceHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { studentId } = await params;
  const { filter } = await searchParams;

  // Query student details
  const studentQuery = await sql`
    SELECT id, nombre_original, nombre_normalizado, documento, estado
    FROM students_normalized
    WHERE id = ${studentId}::uuid
    LIMIT 1
  `;

  if (studentQuery.length === 0) {
    notFound();
  }

  const student = studentQuery[0];

  // Query enrollments / groups
  const enrollmentsQuery = await sql`
    SELECT g.id as group_id, g.nombre as group_name, g.jornada, g.tipo
    FROM enrollments e
    JOIN groups g ON g.id = e.group_id
    WHERE e.student_id = ${studentId}::uuid
  `;

  // Query full attendance history records
  const historyQuery = await sql`
    SELECT 
      ar.id as record_id,
      ar.estado,
      ar.fuente,
      ar.observaciones,
      ar.sede,
      cs.fecha,
      cs.dia_semana_texto,
      g.nombre as group_name
    FROM attendance_records_normalized ar
    JOIN class_sessions cs ON cs.id = ar.session_id
    JOIN groups g ON g.id = cs.group_id
    WHERE ar.student_id = ${studentId}::uuid
    ORDER BY cs.fecha DESC
  `;

  // Statistics calculation
  const totalRecords = historyQuery.length;
  const statusCounts: Record<string, number> = {};
  historyQuery.forEach((r: any) => {
    statusCounts[r.estado] = (statusCounts[r.estado] || 0) + 1;
  });

  const absents = statusCounts['AUSENTE'] || 0;
  const presents = statusCounts['PRESENTE'] || 0;
  const absenceRate = totalRecords > 0 ? ((absents / totalRecords) * 100).toFixed(1) : '0.0';
  const presenceRate = totalRecords > 0 ? ((presents / totalRecords) * 100).toFixed(1) : '0.0';

  // Filter records based on selected filter
  const currentFilter = filter ? filter.toUpperCase() : '';
  const filteredRecords = currentFilter
    ? historyQuery.filter((r: any) => r.estado === currentFilter)
    : historyQuery;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <Link
            href="/admin/attendance/alerts"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-fsm-blue mb-2 transition-colors uppercase"
          >
            <ArrowLeft size={14} /> Volver a Alertas de Ausentismo
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <div className="p-3 bg-blue-50 text-fsm-blue rounded-2xl border border-blue-200">
              <User size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-fsm-blue uppercase tracking-tight">
                {student.nombre_original}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                ID Estudiante: {student.id}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {enrollmentsQuery.map((g: any) => (
            <span key={g.group_id} className="bg-blue-50 text-fsm-blue font-bold px-3 py-1.5 rounded-xl border border-blue-200 text-xs">
              🏫 {g.group_name} ({g.jornada})
            </span>
          ))}
        </div>
      </div>

      {/* Statistics & Filter Shortcut Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href={`/admin/attendance/students/${studentId}`}
          className={`p-5 rounded-2xl border transition-all ${
            !currentFilter ? 'bg-blue-50/80 border-blue-300 shadow-md ring-2 ring-blue-400/20' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
          }`}
        >
          <p className="text-xs font-bold text-gray-400 uppercase">Total Clases Evaluadas</p>
          <p className="text-3xl font-black text-fsm-blue mt-1">{totalRecords}</p>
          <p className="text-[10px] text-gray-500 font-semibold mt-1">Ver Todos los Registros</p>
        </Link>

        <Link
          href={`/admin/attendance/students/${studentId}?filter=PRESENTE`}
          className={`p-5 rounded-2xl border transition-all ${
            currentFilter === 'PRESENTE' ? 'bg-green-50 border-green-300 shadow-md ring-2 ring-green-400/20' : 'bg-white border-green-100 hover:border-green-200 shadow-sm'
          }`}
        >
          <p className="text-xs font-bold text-green-600 uppercase">% Asistencia Efectiva</p>
          <p className="text-3xl font-black text-green-700 mt-1">{presenceRate}%</p>
          <p className="text-[10px] text-green-600 font-semibold mt-1">{presents} Clases Presente →</p>
        </Link>

        <Link
          href={`/admin/attendance/students/${studentId}?filter=AUSENTE`}
          className={`p-5 rounded-2xl border transition-all ${
            currentFilter === 'AUSENTE' ? 'bg-red-50 border-red-300 shadow-md ring-2 ring-red-400/20' : 'bg-white border-red-100 hover:border-red-200 shadow-sm'
          }`}
        >
          <p className="text-xs font-bold text-fsm-red uppercase">❌ Inasistencias / Faltas</p>
          <p className="text-3xl font-black text-fsm-red mt-1">{absents}</p>
          <p className="text-[10px] text-fsm-red font-semibold mt-1">Filtrar Solo Inasistencias →</p>
        </Link>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">Novedades / Observaciones</p>
          <p className="text-3xl font-black text-purple-700 mt-1">
            {historyQuery.filter((r: any) => r.observaciones).length}
          </p>
          <p className="text-[10px] text-purple-600 font-semibold mt-1">Notas de texto libre</p>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <span className="text-xs font-black uppercase text-gray-400 px-2 flex items-center gap-1">
          <Filter size={14} /> Filtrar Por:
        </span>

        <Link
          href={`/admin/attendance/students/${studentId}`}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
            !currentFilter ? 'bg-fsm-blue text-white shadow-sm' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          Todos ({totalRecords})
        </Link>

        <Link
          href={`/admin/attendance/students/${studentId}?filter=AUSENTE`}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
            currentFilter === 'AUSENTE' ? 'bg-fsm-red text-white shadow-sm' : 'bg-red-50 text-fsm-red border border-red-200 hover:bg-red-100'
          }`}
        >
          <XCircle size={14} /> Solo Inasistencias ({absents})
        </Link>

        <Link
          href={`/admin/attendance/students/${studentId}?filter=PRESENTE`}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
            currentFilter === 'PRESENTE' ? 'bg-green-700 text-white shadow-sm' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
          }`}
        >
          <CheckCircle size={14} /> Solo Asistencias ({presents})
        </Link>
      </div>

      {/* Attendance Record History Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight flex items-center gap-2">
            <Calendar size={20} className="text-fsm-blue" />
            HISTORIAL DE ASISTENCIA {currentFilter ? `(${currentFilter})` : 'COMPLETO'}
          </h2>
          <span className="text-xs font-bold text-gray-500">
            {filteredRecords.length} registro(s) listado(s)
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
            <p className="font-bold text-gray-500 text-sm">No se encontraron registros con el filtro seleccionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Día</th>
                  <th className="py-3 px-4">Grupo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Sede / Origen</th>
                  <th className="py-3 px-4">Observaciones / Novedad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredRecords.map((r: any) => {
                  const dateObj = new Date(r.fecha);
                  const fechaStr = dateObj.toISOString().split('T')[0];

                  return (
                    <tr key={r.record_id} className={`hover:bg-gray-50/50 transition-colors ${
                      r.estado === 'AUSENTE' ? 'bg-red-50/20' : ''
                    }`}>
                      <td className="py-3 px-4 font-bold text-gray-800">{fechaStr}</td>
                      <td className="py-3 px-4 font-semibold text-gray-500">{r.dia_semana_texto || '-'}</td>
                      <td className="py-3 px-4 font-bold text-fsm-blue">{r.group_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg font-black uppercase text-[10px] border ${
                          r.estado === 'PRESENTE' ? 'bg-green-50 text-green-700 border-green-200' :
                          r.estado === 'AUSENTE' ? 'bg-red-50 text-fsm-red border-red-200 shadow-sm' :
                          'bg-blue-50 text-fsm-blue border-blue-200'
                        }`}>
                          {r.estado === 'AUSENTE' ? '❌ INASISTENCIA' : r.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-semibold">
                        🏫 {r.sede || 'Sede 1'} ({r.fuente})
                      </td>
                      <td className="py-3 px-4">
                        {r.observaciones ? (
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                            💬 {r.observaciones}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
