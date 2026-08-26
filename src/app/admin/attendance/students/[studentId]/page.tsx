import { neon } from '@neondatabase/serverless';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { User, Calendar, ArrowLeft, Filter, XCircle, CheckCircle } from 'lucide-react';
import StudentHistoryClient from './StudentHistoryClient';

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

  // Query student details from students_normalized or legacy students
  const studentQuery = await sql`
    SELECT id, nombre_original, nombre_normalizado, documento, estado
    FROM students_normalized
    WHERE id = ${studentId}::uuid
    UNION
    SELECT id, nombre as nombre_original, nombre as nombre_normalizado, documento, 'ACTIVO' as estado
    FROM students
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

  // 1. Get class sessions for the student's group up to current date
  const sessionsQuery = await sql`
    SELECT 
      cs.id as session_id,
      cs.fecha,
      cs.dia_semana_texto,
      g.nombre as group_name,
      g.id as group_id
    FROM class_sessions cs
    JOIN enrollments e ON e.group_id = cs.group_id
    JOIN groups g ON g.id = cs.group_id
    WHERE e.student_id = ${studentId}::uuid
      AND cs.fecha <= CURRENT_DATE
    ORDER BY cs.fecha DESC
  `;

  // 2. Get RFID scan events for this student
  const rfidEvents = await sql`
    SELECT 
      timestamp,
      tipo_evento,
      sede,
      observaciones
    FROM attendance_events
    WHERE student_id = ${studentId}::uuid
  `;

  const rfidMap = new Map();
  rfidEvents.forEach((ev: any) => {
    const dStr = new Date(ev.timestamp).toISOString().split('T')[0];
    if (!rfidMap.has(dStr)) {
      rfidMap.set(dStr, ev);
    }
  });

  // 3. Get custom excuse / status overrides from attendance_records_normalized
  const recordOverrides = await sql`
    SELECT session_id, estado, fuente, observaciones, sede
    FROM attendance_records_normalized
    WHERE student_id = ${studentId}::uuid
  `;
  const overrideMap = new Map();
  recordOverrides.forEach((r: any) => {
    overrideMap.set(r.session_id, r);
  });

  // 4. Synthesize complete history per class session
  const historyRecords = sessionsQuery.map((sess: any) => {
    const fStr = new Date(sess.fecha).toISOString().split('T')[0];
    const rfidScan = rfidMap.get(fStr);
    const override = overrideMap.get(sess.session_id);

    let estado = 'AUSENTE';
    let fuente = 'MANUAL';
    let sede = 'Sede 1';
    let observaciones = '';
    let scanTime = undefined;

    if (override) {
      estado = override.estado;
      fuente = override.fuente;
      sede = override.sede || 'Sede 1';
      observaciones = override.observaciones || '';
    } else if (rfidScan) {
      estado = 'PRESENTE';
      fuente = 'RFID';
      sede = rfidScan.sede || 'Sede 1';
      observaciones = rfidScan.observaciones || '';
      const dateObj = new Date(rfidScan.timestamp);
      scanTime = dateObj.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
    }

    return {
      session_id: sess.session_id,
      fecha: fStr,
      dia_semana_texto: sess.dia_semana_texto,
      group_name: sess.group_name,
      estado,
      fuente,
      sede,
      observaciones,
      scan_time: scanTime
    };
  });

  // Statistics calculation
  const totalRecords = historyRecords.length;
  const statusCounts: Record<string, number> = {};
  historyRecords.forEach((r: any) => {
    statusCounts[r.estado] = (statusCounts[r.estado] || 0) + 1;
  });

  const absents = statusCounts['AUSENTE'] || 0;
  const presents = statusCounts['PRESENTE'] || 0;
  const absenceRate = totalRecords > 0 ? ((absents / totalRecords) * 100).toFixed(1) : '0.0';
  const presenceRate = totalRecords > 0 ? ((presents / totalRecords) * 100).toFixed(1) : '0.0';

  // Filter records based on selected filter
  const currentFilter = filter ? filter.toUpperCase() : '';
  const filteredRecords = currentFilter
    ? historyRecords.filter((r: any) => r.estado === currentFilter)
    : historyRecords;

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
          <p className="text-xs font-bold text-gray-400 uppercase">Novedades / Excusa Medicas</p>
          <p className="text-3xl font-black text-purple-700 mt-1">
            {historyRecords.filter((r: any) => r.observaciones).length}
          </p>
          <p className="text-[10px] text-purple-600 font-semibold mt-1">Excusas y observaciones</p>
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

      {/* Attendance Record History Table with Client Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight flex items-center gap-2">
            <Calendar size={20} className="text-fsm-blue" />
            HISTORIAL COMPLETO Y EXCUSAS {currentFilter ? `(${currentFilter})` : ''}
          </h2>
          <span className="text-xs font-bold text-gray-500">
            {filteredRecords.length} sesión(es) evaluada(s)
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
            <p className="font-bold text-gray-500 text-sm">No se encontraron registros con el filtro seleccionado.</p>
          </div>
        ) : (
          <StudentHistoryClient studentId={studentId} records={filteredRecords} />
        )}
      </div>
    </div>
  );
}
