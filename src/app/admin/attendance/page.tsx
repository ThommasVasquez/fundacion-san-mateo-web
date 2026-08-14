import React from 'react';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { 
  Users, UserCheck, AlertTriangle, HelpCircle, 
  Search, Calendar, Filter, ArrowLeft, Clock, ChevronRight, X, Tag, Upload, ArrowUpDown
} from 'lucide-react';
import RefreshButton from './RefreshButton';
import ExportCsvButton from './ExportCsvButton';

export const dynamic = 'force-dynamic';

const ZONA_HORARIA = 'America/Bogota';

interface AttendancePageProps {
  searchParams: Promise<{
    date?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    grado?: string;
    anomalyOnly?: string;
    sort?: string;
    studentHistoryId?: string;
  }>;
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  const filterStartDate = params.startDate || params.date || todayStr;
  const filterEndDate = params.endDate || params.date || filterStartDate;
  const filterSearch = (params.search || '').trim();
  const filterGrado = params.grado || '';
  const filterAnomalyOnly = params.anomalyOnly === 'true';
  const filterSort = params.sort || 'time_desc';
  const historyStudentId = params.studentHistoryId || '';

  // 1. Fetch Stats for selected range
  const totalScansRes = await sql`
    SELECT count(*) FROM attendance_events 
    WHERE (timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
      AND (timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
  `;
  const totalScans = parseInt(totalScansRes[0].count);

  const unassignedRes = await sql`
    SELECT count(*) FROM attendance_events 
    WHERE student_id IS NULL 
      AND (timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
      AND (timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
  `;
  const unassignedScans = parseInt(unassignedRes[0].count);

  // Unique students who attended during selected date range
  const uniqueStudentsRes = await sql`
    SELECT count(DISTINCT student_id) FROM attendance_events
    WHERE student_id IS NOT NULL 
      AND (timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
      AND (timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
  `;
  const uniqueStudents = parseInt(uniqueStudentsRes[0].count);

  // Total active students in DB
  const totalStudentsRes = await sql`SELECT count(*) FROM students WHERE activo = TRUE`;
  const totalStudentsInDB = parseInt(totalStudentsRes[0].count);

  // 2. Fetch Grades for Filter
  const gradesRes = await sql`
    SELECT DISTINCT grado FROM students WHERE grado IS NOT NULL ORDER BY grado
  `;
  const grades = gradesRes.map((g: any) => g.grado);

  // 3. Fetch Events for date range
  const events = await sql`
    SELECT 
      ae.id,
      ae.student_id,
      ae.rfid_tag_uid,
      ae.reader_id,
      ae.tipo_evento,
      ae.timestamp,
      ae.origen,
      ae.sincronizado,
      ae.geolocalizacion,
      ae.registrado_por,
      s.nombre as student_name, 
      s.grado as student_grado, 
      r.ubicacion as reader_name,
      r.tipo as reader_tipo
    FROM attendance_events ae
    LEFT JOIN students s ON ae.student_id = s.id
    LEFT JOIN readers r ON ae.reader_id = r.id
    WHERE (ae.timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
      AND (ae.timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
    ORDER BY ae.timestamp DESC
  `;

  // Process events: Anomaly = Unassigned Tag
  const processedEvents = events.map((ev: any) => {
    const isAnomaly = !ev.student_id;
    const anomalyReason = isAnomaly ? 'Tarjeta sin asignar' : '';

    return {
      ...ev,
      isAnomaly,
      anomalyReason
    };
  });

  // Filter in memory by search, degree, and anomaly
  const searchLower = filterSearch.toLowerCase();
  let filteredEvents = processedEvents.filter((ev: any) => {
    if (filterGrado && ev.student_grado !== filterGrado) return false;
    if (filterAnomalyOnly && !ev.isAnomaly) return false;
    if (filterSearch) {
      const nameMatch = (ev.student_name || 'Tarjeta no asignada').toLowerCase().includes(searchLower);
      const gradoMatch = (ev.student_grado || '').toLowerCase().includes(searchLower);
      const uidMatch = (ev.rfid_tag_uid || '').toLowerCase().includes(searchLower);
      const readerMatch = (ev.reader_name || ev.reader_id || '').toLowerCase().includes(searchLower);
      return nameMatch || gradoMatch || uidMatch || readerMatch;
    }
    return true;
  });

  // Sorting
  filteredEvents.sort((a: any, b: any) => {
    if (filterSort === 'time_asc') {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    if (filterSort === 'name_asc') {
      const nameA = a.student_name || 'ZZZ';
      const nameB = b.student_name || 'ZZZ';
      return nameA.localeCompare(nameB);
    }
    if (filterSort === 'name_desc') {
      const nameA = a.student_name || 'AAA';
      const nameB = b.student_name || 'AAA';
      return nameB.localeCompare(nameA);
    }
    if (filterSort === 'grado_asc') {
      const gA = a.student_grado || 'ZZZ';
      const gB = b.student_grado || 'ZZZ';
      return gA.localeCompare(gB);
    }
    // Default: time_desc
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const totalAnomalies = processedEvents.filter((ev: any) => ev.isAnomaly).length;

  // Student History overlay
  let historyStudent = null;
  let historyEvents = [];
  if (historyStudentId) {
    const studentsRes = await sql`
      SELECT nombre, grado, rfid_tag_uid FROM students WHERE id = ${historyStudentId} LIMIT 1
    `;
    if (studentsRes.length > 0) {
      historyStudent = studentsRes[0];
      historyEvents = await sql`
        SELECT ae.*, r.ubicacion as reader_name
        FROM attendance_events ae
        LEFT JOIN readers r ON ae.reader_id = r.id
        WHERE ae.student_id = ${historyStudentId}
        ORDER BY ae.timestamp DESC
        LIMIT 50
      `;
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 relative">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-gray-700 mb-4">
        <Link href="/admin" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <ArrowLeft size={14} /> Panel
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Control de Asistencia</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mb-2">CONTROL DE ASISTENCIA</h1>
          <p className="text-gray-900 font-medium">Asistencia diaria y hora de entrada de los estudiantes.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <ExportCsvButton events={filteredEvents} startDate={filterStartDate} endDate={filterEndDate} />
          <Link
            href="/admin/attendance/import"
            className="px-5 py-2.5 bg-white text-fsm-blue border border-fsm-blue/20 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-blue hover:text-white transition-all shadow-sm flex items-center gap-2"
          >
            <Upload size={14} /> Subir Alumnos
          </Link>
          <Link
            href="/admin/attendance/enrollment"
            className="px-5 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-sm flex items-center gap-2"
          >
            <Users size={14} /> Gestión y Edición de Estudiantes
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-fsm-blue/5 text-fsm-blue flex items-center justify-center">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Total Asistencias</p>
            <h3 className="text-2xl font-black text-fsm-blue leading-none">{totalScans}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Alumnos Asistentes</p>
            <h3 className="text-2xl font-black text-fsm-blue leading-none">{uniqueStudents} <span className="text-xs font-normal text-gray-400">/ {totalStudentsInDB}</span></h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
            <HelpCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Sin Asignar</p>
            <h3 className="text-2xl font-black text-fsm-blue leading-none">{unassignedScans}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-fsm-red flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Sin Asignar (Anomalías)</p>
            <h3 className="text-2xl font-black text-fsm-blue leading-none">{totalAnomalies}</h3>
          </div>
        </div>
      </div>

      {/* Advanced Filters Form */}
      <form method="GET" className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          
          {/* Search Input */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 flex-1 min-w-[220px]">
            <Search size={16} className="text-gray-400" />
            <input 
              type="text" 
              name="search"
              placeholder="Buscar estudiante, UID o lector..."
              defaultValue={filterSearch}
              className="bg-transparent font-bold text-xs text-gray-700 outline-none w-full" 
            />
          </div>

          {/* Date Range: Start Date */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-[10px] font-black uppercase text-gray-400">Desde:</span>
            <input 
              type="date" 
              name="startDate"
              defaultValue={filterStartDate}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none" 
            />
          </div>

          {/* Date Range: End Date */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-[10px] font-black uppercase text-gray-400">Hasta:</span>
            <input 
              type="date" 
              name="endDate"
              defaultValue={filterEndDate}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none" 
            />
          </div>

          {/* Grade Selector */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
            <Filter size={16} className="text-gray-400" />
            <select 
              name="grado"
              defaultValue={filterGrado}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none"
            >
              <option value="">Todos los Grados / Turnos</option>
              {grades.map((g: string) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Sort Order Selector */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
            <ArrowUpDown size={16} className="text-gray-400" />
            <select 
              name="sort"
              defaultValue={filterSort}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none"
            >
              <option value="time_desc">Hora (Más reciente primero)</option>
              <option value="time_asc">Hora (Más antiguo primero)</option>
              <option value="name_asc">Nombre (A - Z)</option>
              <option value="name_desc">Nombre (Z - A)</option>
              <option value="grado_asc">Grado (A - Z)</option>
            </select>
          </div>

          {/* Anomaly Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase text-gray-700 select-none">
            <input 
              type="checkbox" 
              name="anomalyOnly"
              value="true"
              defaultChecked={filterAnomalyOnly}
              className="w-4 h-4 rounded border-gray-300 text-fsm-red focus:ring-fsm-red" 
            />
            <span>Solo Sin Asignar</span>
          </label>

          <RefreshButton />
        </div>
      </form>

      {/* Attendance Grid */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 font-black text-[9px] uppercase tracking-widest bg-gray-50/50">
                <th className="py-4 px-8">Estudiante</th>
                <th className="py-4 px-6">Grado / Turno</th>
                <th className="py-4 px-6">Lector / Ubicación</th>
                <th className="py-4 px-6">Origen</th>
                <th className="py-4 px-6">Hora de Entrada</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-8 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm font-medium text-gray-400">
                    No se encontraron registros de asistencia para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                    <td className="py-4 px-8">
                      {ev.student_name ? (
                        <div>
                          <p className="font-bold text-fsm-blue">{ev.student_name}</p>
                          <p className="text-[10px] text-gray-500 font-medium">RFID: {ev.rfid_tag_uid}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-yellow-600">Tarjeta no asignada</p>
                          <p className="text-[10px] text-gray-500 font-medium">UID: {ev.rfid_tag_uid}</p>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-700">{ev.student_grado || 'N/A'}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-800">{ev.reader_name || 'Desconocido'}</p>
                      <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                        ID: {ev.reader_id}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        ev.origen === 'movil_profesor'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {ev.origen === 'movil_profesor' ? 'Móvil Profesor' : 'Panel Fijo'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-600">
                      <div>
                        <p className="font-bold text-gray-800">
                          {new Date(ev.timestamp).toLocaleTimeString('es-CO', { timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(ev.timestamp).toLocaleDateString('es-CO', { timeZone: ZONA_HORARIA })}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {ev.isAnomaly ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-fsm-red border border-red-100" title={ev.anomalyReason}>
                          <AlertTriangle size={10} /> Sin Asignar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700">
                          Asistió
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-8 text-right">
                      {ev.student_id ? (
                        <Link 
                          href={`/admin/attendance?startDate=${filterStartDate}&endDate=${filterEndDate}&grado=${filterGrado}&anomalyOnly=${filterAnomalyOnly ? 'true' : ''}&studentHistoryId=${ev.student_id}`}
                          className="px-3 py-1.5 bg-gray-50 text-fsm-blue border border-gray-100 hover:bg-fsm-blue hover:text-white transition-all text-xs font-bold rounded-lg"
                        >
                          Historial
                        </Link>
                      ) : (
                        <Link 
                          href={`/admin/attendance/enrollment?pendingUid=${ev.rfid_tag_uid}`}
                          className="px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-100 hover:bg-yellow-500 hover:text-white transition-all text-xs font-bold rounded-lg"
                        >
                          Asignar
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student History Overlay Modal */}
      {historyStudent && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-2xl h-[70vh] flex flex-col relative animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center bg-fsm-blue text-white px-8 py-5">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase">Historial del Estudiante</span>
                <h3 className="text-xl font-black uppercase mt-0.5">{historyStudent.nombre}</h3>
                <p className="text-xs opacity-75 font-semibold">Grado: {historyStudent.grado} | Tag UID: {historyStudent.rfid_tag_uid || 'No vinculado'}</p>
              </div>
              <Link 
                href={`/admin/attendance?startDate=${filterStartDate}&endDate=${filterEndDate}&grado=${filterGrado}&anomalyOnly=${filterAnomalyOnly ? 'true' : ''}`}
                className="text-white/70 hover:text-fsm-red transition-colors p-1"
              >
                <X size={20} />
              </Link>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {historyEvents.length === 0 ? (
                <p className="text-center text-gray-400 font-medium py-12">No hay registros de asistencia para este estudiante.</p>
              ) : (
                <div className="relative border-l border-gray-100 pl-6 ml-3 space-y-6">
                  {historyEvents.map((hev: any) => (
                    <div key={hev.id} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                        hev.tipo_evento === 'entrada' ? 'bg-green-500' : 'bg-orange-500'
                      }`} />
                      
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            hev.tipo_evento === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {hev.tipo_evento}
                          </span>
                          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(hev.timestamp).toLocaleString('es-CO', { timeZone: ZONA_HORARIA })}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-800">Ubicación: {hev.reader_name || hev.reader_id}</p>
                        <p className="text-[10px] text-gray-500 font-medium">
                          Origen: {hev.origen === 'movil_profesor' ? 'Dispositivo Móvil' : 'Lector Fijo'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-8 py-4 text-right">
              <Link 
                href={`/admin/attendance?startDate=${filterStartDate}&endDate=${filterEndDate}&grado=${filterGrado}&anomalyOnly=${filterAnomalyOnly ? 'true' : ''}`}
                className="px-6 py-2 bg-white text-fsm-blue border border-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
              >
                Cerrar
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

