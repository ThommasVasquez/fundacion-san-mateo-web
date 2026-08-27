import React from 'react';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { 
  Users, UserCheck, AlertTriangle, HelpCircle, 
  Search, Calendar, Filter, ArrowLeft, Clock, ChevronRight, X, Tag, Upload, ArrowUpDown, Bell
} from 'lucide-react';
import RefreshButton from './RefreshButton';
import ExportCsvButton from './ExportCsvButton';
import ManualAttendanceModal from './ManualAttendanceModal';
import { getPendingAbsenceAlertsCount } from '@/app/actions';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

const ZONA_HORARIA = 'America/Bogota';

interface AttendancePageProps {
  searchParams: Promise<{
    date?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    grado?: string;
    sede?: string;
    anomalyOnly?: string;
    absencesOnly?: string;
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
  const filterSede = params.sede || '';
  const filterAnomalyOnly = params.anomalyOnly === 'true';
  const filterAbsencesOnly = params.absencesOnly === 'true';
  const filterSort = params.sort || 'time_desc';
  const historyStudentId = params.studentHistoryId || '';

  const buildFilterUrl = (studentHistId?: string) => {
    const p = new URLSearchParams();
    if (filterStartDate) p.set('startDate', filterStartDate);
    if (filterEndDate) p.set('endDate', filterEndDate);
    if (filterSearch) p.set('search', filterSearch);
    if (filterGrado) p.set('grado', filterGrado);
    if (filterSede) p.set('sede', filterSede);
    if (filterAnomalyOnly) p.set('anomalyOnly', 'true');
    if (filterAbsencesOnly) p.set('absencesOnly', 'true');
    if (filterSort) p.set('sort', filterSort);
    if (studentHistId) p.set('studentHistoryId', studentHistId);
    return `/admin/attendance?${p.toString()}`;
  };

  // Parallel execution of all primary queries
  const [
    totalScansRes,
    unassignedRes,
    uniqueStudentsRes,
    totalStudentsRes,
    gradesRes,
    absencesCountRes,
    eventsOrAbsencesRes,
    studentsRes,
    groupsRes,
    alertsRes
  ] = await Promise.all([
    sql`
      SELECT count(*) FROM attendance_events 
      WHERE (timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
        AND (timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
    `,
    sql`
      SELECT count(*) FROM attendance_events 
      WHERE student_id IS NULL 
        AND (timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
        AND (timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
    `,
    sql`
      SELECT count(DISTINCT student_id) FROM attendance_events
      WHERE student_id IS NOT NULL 
        AND (timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
        AND (timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
    `,
    sql`SELECT count(*) FROM students WHERE activo = TRUE`,
    sql`SELECT DISTINCT grado FROM students WHERE grado IS NOT NULL ORDER BY grado`,
    sql`
      SELECT count(*) as count
      FROM attendance_records_normalized ar
      JOIN class_sessions cs ON cs.id = ar.session_id
      JOIN students_normalized s ON s.id = ar.student_id
      LEFT JOIN enrollments e ON e.student_id = s.id
      LEFT JOIN groups g ON g.id = e.group_id
      WHERE ar.estado = 'AUSENTE'
        AND cs.fecha >= ${filterStartDate}::date
        AND cs.fecha <= ${filterEndDate}::date
        ${filterGrado ? sql`AND g.nombre = ${filterGrado}` : sql``}
        ${filterSede ? sql`AND ar.sede = ${filterSede}` : sql``}
    `,
    filterAbsencesOnly ? sql`
      SELECT 
        ar.id,
        ar.student_id,
        s.nombre_original as student_name,
        g.nombre as student_grado,
        'manual' as origen,
        'inasistencia' as tipo_evento,
        cs.fecha::text as timestamp,
        ar.sede,
        ar.observaciones,
        ar.estado,
        'Sin marcación de entrada' as reader_name
      FROM attendance_records_normalized ar
      JOIN class_sessions cs ON cs.id = ar.session_id
      JOIN students_normalized s ON s.id = ar.student_id
      JOIN groups g ON g.id = cs.group_id
      WHERE ar.estado = 'AUSENTE'
        AND cs.fecha >= ${filterStartDate}::date
        AND cs.fecha <= ${filterEndDate}::date
      ORDER BY cs.fecha DESC, s.nombre_original ASC
    ` : sql`
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
        ae.sede,
        ae.observaciones,
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
    `,
    sql`SELECT id, nombre, grado FROM students WHERE activo = TRUE ORDER BY nombre`,
    sql`SELECT id, nombre, jornada FROM groups ORDER BY nombre`,
    getPendingAbsenceAlertsCount()
  ]);

  const totalScans = parseInt(totalScansRes[0].count);
  const unassignedScans = parseInt(unassignedRes[0].count);
  const uniqueStudents = parseInt(uniqueStudentsRes[0].count);
  const totalStudentsInDB = parseInt(totalStudentsRes[0].count);

  const grades = gradesRes
    .map((g: any) => g.grado)
    .sort((a: string, b: string) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' }));

  const totalRealAbsencesCount = parseInt(absencesCountRes[0]?.count || '0', 10);

  let rawEvents: any[] = [];
  if (filterAbsencesOnly) {
    rawEvents = eventsOrAbsencesRes.map((a: any) => ({
      ...a,
      isAnomaly: false,
      anomalyReason: '',
      rfid_tag_uid: 'N/A'
    }));
  } else {
    rawEvents = eventsOrAbsencesRes.map((ev: any) => {
      const isAnomaly = !ev.student_id;
      return {
        ...ev,
        isAnomaly,
        anomalyReason: isAnomaly ? 'Tarjeta sin asignar' : ''
      };
    });
  }

  // Filter in memory by search, degree, sede, and anomaly
  const searchLower = filterSearch.toLowerCase();
  let filteredEvents = rawEvents.filter((ev: any) => {
    if (filterGrado && ev.student_grado !== filterGrado) return false;
    if (filterSede && (ev.sede || 'Sede 1') !== filterSede) return false;
    if (filterAnomalyOnly && !ev.isAnomaly) return false;
    if (filterSearch) {
      const nameMatch = (ev.student_name || 'Tarjeta no asignada').toLowerCase().includes(searchLower);
      const gradoMatch = (ev.student_grado || '').toLowerCase().includes(searchLower);
      const uidMatch = (ev.rfid_tag_uid || '').toLowerCase().includes(searchLower);
      const readerMatch = (ev.reader_name || ev.reader_id || '').toLowerCase().includes(searchLower);
      const sedeMatch = (ev.sede || 'Sede 1').toLowerCase().includes(searchLower);
      const obsMatch = (ev.observaciones || '').toLowerCase().includes(searchLower);
      return nameMatch || gradoMatch || uidMatch || readerMatch || sedeMatch || obsMatch;
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

  const totalAnomalies = rawEvents.filter((ev: any) => ev.isAnomaly).length;

  // Student History overlay
  let historyStudent: any = null;
  let historyEvents: any[] = [];
  if (historyStudentId) {
    // 1. Try querying students_normalized
    const normRes = await sql`
      SELECT 
        sn.id as norm_id, 
        sn.id, 
        sn.nombre_original as nombre, 
        sn.rfid_tag_uid, 
        g.nombre as grado
      FROM students_normalized sn
      LEFT JOIN enrollments e ON e.student_id = sn.id
      LEFT JOIN groups g ON g.id = e.group_id
      WHERE sn.id = ${historyStudentId}::uuid
      LIMIT 1
    `;

    if (normRes.length > 0) {
      historyStudent = normRes[0];
    } else {
      // 2. Fallback to legacy students table
      const legacyRes = await sql`
        SELECT 
          s.id, 
          s.nombre, 
          s.grado, 
          s.rfid_tag_uid, 
          sn.id as norm_id
        FROM students s
        LEFT JOIN students_normalized sn ON sn.nombre_normalizado = UPPER(TRIM(s.nombre))
        WHERE s.id = ${historyStudentId}::uuid
        LIMIT 1
      `;
      if (legacyRes.length > 0) {
        historyStudent = legacyRes[0];
      }
    }

    if (historyStudent) {
      const targetStudentId = historyStudent.norm_id || historyStudent.id;

      // 1. Query class sessions for the student's group
      const sessions = await sql`
        SELECT 
          cs.id as session_id,
          cs.fecha,
          cs.fecha::text as fecha_text,
          cs.dia_semana_texto,
          g.nombre as group_name
        FROM class_sessions cs
        JOIN enrollments e ON e.group_id = cs.group_id
        JOIN groups g ON g.id = cs.group_id
        WHERE e.student_id = ${targetStudentId}::uuid
          AND cs.fecha <= CURRENT_DATE
        ORDER BY cs.fecha DESC
        LIMIT 60
      `;

      // 2. Query RFID events
      const rfidScans = await sql`
        SELECT ae.*, r.ubicacion as reader_name
        FROM attendance_events ae
        LEFT JOIN readers r ON ae.reader_id = r.id
        WHERE ae.student_id = ${historyStudentId}::uuid OR ae.student_id = ${targetStudentId}::uuid
        ORDER BY ae.timestamp DESC
      `;

      const rfidMap = new Map();
      rfidScans.forEach((ev: any) => {
        const dStr = new Date(ev.timestamp).toLocaleDateString('sv-SE', { timeZone: ZONA_HORARIA });
        if (!rfidMap.has(dStr)) {
          rfidMap.set(dStr, ev);
        }
      });

      // 3. Query custom overrides
      const overrides = await sql`
        SELECT session_id, estado, fuente, observaciones, sede
        FROM attendance_records_normalized
        WHERE student_id = ${targetStudentId}::uuid
      `;
      const overrideMap = new Map();
      overrides.forEach((o: any) => {
        overrideMap.set(o.session_id, o);
      });

      // 4. Synthesize events list
      if (sessions.length > 0) {
        historyEvents = sessions.map((sess: any) => {
          const fStr = sess.fecha_text || (typeof sess.fecha === 'string' ? sess.fecha.split('T')[0] : new Date(sess.fecha).toISOString().split('T')[0]);
          const rfid = rfidMap.get(fStr);
          const ov = overrideMap.get(sess.session_id);

          let estado = 'AUSENTE';
          let tipo_evento = 'inasistencia';
          let reader_name = 'Sin marcación de entrada';
          let origen = 'Sistema';
          let timestamp = fStr;
          let observaciones = '';
          let sede = 'Sede 1';

          if (ov) {
            estado = ov.estado;
            tipo_evento = ov.estado === 'PRESENTE' ? 'entrada' : ov.estado.toLowerCase();
            observaciones = ov.observaciones || '';
            sede = ov.sede || 'Sede 1';
          } else if (rfid) {
            estado = 'PRESENTE';
            tipo_evento = rfid.tipo_evento;
            reader_name = rfid.reader_name || rfid.reader_id;
            origen = rfid.origen === 'movil_profesor' ? 'Dispositivo Móvil' : 'Lector Fijo';
            timestamp = rfid.timestamp;
            observaciones = rfid.observaciones || '';
            sede = rfid.sede || 'Sede 1';
          }

          return {
            id: sess.session_id,
            fecha: fStr,
            dia_semana_texto: sess.dia_semana_texto,
            group_name: sess.group_name,
            estado,
            tipo_evento,
            reader_name,
            origen,
            timestamp,
            observaciones,
            sede
          };
        });
      } else {
        // Fallback to RFID scans
        historyEvents = rfidScans.map((hev: any) => ({
          ...hev,
          estado: 'PRESENTE',
          fecha: new Date(hev.timestamp).toLocaleDateString('sv-SE', { timeZone: ZONA_HORARIA })
        }));
      }
    }
  }

  const allStudentsForManual = studentsRes;
  const pendingAlerts = alertsRes;

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

      {/* Inter-Shift Absence Alert Banner */}
      {pendingAlerts.pendingCount > 0 && (
        <div className="bg-blue-50/80 border-2 border-blue-200 p-6 rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-fsm-blue text-white rounded-2xl flex items-center justify-center shrink-0 font-black shadow-md">
              <Bell size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest bg-white px-2.5 py-0.5 rounded border border-blue-200">
                NOTIFICACIÓN DE TRASPASO ENTRE TURNOS
              </span>
              <h3 className="text-lg font-black text-fsm-blue uppercase mt-0.5">
                {pendingAlerts.pendingCount} ESTUDIANTE(S) INASISTENTE(S) PENDIENTES POR CONTACTAR
              </h3>
              <p className="text-xs font-semibold text-gray-700">
                Atención secretaría: Hay ausencias registradas que requieren seguimiento telefónico y verificación de excusas.
              </p>
            </div>
          </div>

          <Link
            href="/admin/attendance/absences"
            className="px-6 py-3 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md shrink-0 flex items-center gap-2"
          >
            Gestionar Ausencias <ChevronRight size={16} />
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mb-2">CONTROL DE ASISTENCIA</h1>
          <p className="text-gray-900 font-medium">Asistencia diaria y hora de entrada de los estudiantes.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <ManualAttendanceModal 
            students={allStudentsForManual.map((s: any) => ({
              id: s.id,
              nombre: s.nombre,
              grado: s.grado,
              activo: s.activo
            }))} 
          />
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
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Total Marcaciones/Escaneos</p>
            <h3 className="text-2xl font-black text-fsm-blue leading-none">{totalScans} <span className="text-[10px] font-normal text-gray-400">({uniqueStudents} únicos)</span></h3>
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
      <form method="GET" className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium space-y-4">
        {/* Row 1: Main Search, Date Range & Refresh */}
        <div className="flex flex-wrap gap-4 items-center justify-between border-b border-gray-100 pb-4">
          {/* Search Input */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 flex-1 min-w-[280px]">
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

          <RefreshButton />
        </div>

        {/* Row 2: Selectors & Special Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Sede Selector */}
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
              <span className="text-[10px] font-black uppercase text-gray-400">Sede:</span>
              <select 
                name="sede"
                defaultValue={filterSede}
                className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none cursor-pointer"
              >
                <option value="">Todas las Sedes</option>
                <option value="Sede 1">Sede 1</option>
                <option value="Sede 2">Sede 2</option>
              </select>
            </div>

            {/* Grade Selector */}
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
              <Filter size={16} className="text-gray-400" />
              <select 
                name="grado"
                defaultValue={filterGrado}
                className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none cursor-pointer"
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
                className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none cursor-pointer"
              >
                <option value="time_desc">Hora (Más reciente)</option>
                <option value="time_asc">Hora (Más antiguo)</option>
                <option value="name_asc">Nombre (A - Z)</option>
                <option value="name_desc">Nombre (Z - A)</option>
                <option value="grado_asc">Grado (A - Z)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Anomaly Checkbox */}
            <label className={`flex items-center gap-2 cursor-pointer font-bold text-xs uppercase select-none px-3.5 py-2 rounded-xl border transition-all ${
              filterAnomalyOnly ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm font-black' : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100'
            }`}>
              <input 
                type="checkbox" 
                name="anomalyOnly"
                value="true"
                defaultChecked={filterAnomalyOnly}
                className="w-4 h-4 rounded border-gray-300 text-fsm-red focus:ring-fsm-red" 
              />
              <span>Solo Sin Asignar ({totalAnomalies})</span>
            </label>

            {/* Absences Only Checkbox */}
            <label className={`flex items-center gap-2 cursor-pointer font-bold text-xs uppercase select-none px-3.5 py-2 rounded-xl border transition-all ${
              filterAbsencesOnly ? 'bg-red-100 text-fsm-red border-red-300 shadow-sm font-black' : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100'
            }`}>
              <input 
                type="checkbox" 
                name="absencesOnly"
                value="true"
                defaultChecked={filterAbsencesOnly}
                className="w-4 h-4 rounded border-red-300 text-fsm-red focus:ring-fsm-red" 
              />
              <span>❌ Solo Inasistencias ({filterAbsencesOnly ? filteredEvents.length : totalRealAbsencesCount})</span>
            </label>
          </div>
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
                <th className="py-4 px-6">Tipo / Hora</th>
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
                          {ev.observaciones && (
                            <span className="inline-block mt-1 text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                              💬 {ev.observaciones}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-yellow-600">Tarjeta no asignada</p>
                          <p className="text-[10px] text-gray-500 font-medium">UID: {ev.rfid_tag_uid}</p>
                          {ev.observaciones && (
                            <span className="inline-block mt-1 text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                              💬 {ev.observaciones}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-700">{ev.student_grado || 'N/A'}</td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-blue-50 text-fsm-blue px-2 py-0.5 rounded-md border border-blue-200">
                          🏫 {ev.sede || 'Sede 1'}
                        </span>
                        <p className="font-bold text-gray-800 text-xs">{ev.reader_name || 'Lector Entrada'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        ev.origen === 'manual'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : ev.origen === 'movil_profesor'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {ev.origen === 'manual' ? '✏️ Manual' : ev.origen === 'movil_profesor' ? '📱 Móvil' : '🖥️ Panel Fijo'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-600">
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase mb-1 ${
                          ev.estado === 'AUSENTE'
                            ? 'bg-red-100 text-fsm-red border border-red-200 shadow-sm'
                            : ev.tipo_evento === 'salida'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {ev.estado === 'AUSENTE' ? '❌ INASISTENCIA' : ev.tipo_evento === 'salida' ? '📤 SALIDA' : '📥 ENTRADA'}
                        </span>
                        <p className="font-bold text-gray-800">
                          {ev.estado === 'AUSENTE'
                            ? `Fecha: ${formatDateDDMMYYYY(ev.timestamp)}`
                            : new Date(ev.timestamp).toLocaleTimeString('es-CO', { timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatDateDDMMYYYY(ev.timestamp)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {ev.estado === 'AUSENTE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-fsm-red border border-red-200">
                          Inasistió
                        </span>
                      ) : ev.isAnomaly ? (
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
                          href={buildFilterUrl(ev.student_id)}
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
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-2xl h-[75vh] flex flex-col relative animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center bg-fsm-blue text-white px-8 py-5">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase">Historial del Estudiante</span>
                <h3 className="text-xl font-black uppercase mt-0.5">{historyStudent.nombre}</h3>
                <p className="text-xs opacity-75 font-semibold">Grado: {historyStudent.grado} | Tag UID: {historyStudent.rfid_tag_uid || 'No vinculado'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link 
                  href={`/admin/attendance/students/${historyStudent.norm_id || historyStudent.id}`}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20"
                >
                  📝 Editor de Excusas →
                </Link>
                <Link 
                  href={buildFilterUrl()}
                  className="text-white/70 hover:text-fsm-red transition-colors p-1"
                >
                  <X size={20} />
                </Link>
              </div>
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
                        hev.estado === 'AUSENTE' ? 'bg-fsm-red' : hev.tipo_evento === 'entrada' ? 'bg-green-500' : 'bg-orange-500'
                      }`} />
                      
                      <div className={`p-4 rounded-2xl border space-y-1 ${
                        hev.estado === 'AUSENTE' ? 'bg-red-50/40 border-red-100' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                            hev.estado === 'AUSENTE'
                              ? 'bg-red-100 text-fsm-red border-red-200'
                              : hev.tipo_evento === 'salida'
                              ? 'bg-orange-100 text-orange-700 border-orange-200'
                              : 'bg-green-100 text-green-700 border-green-200'
                          }`}>
                            {hev.estado === 'AUSENTE' ? '❌ INASISTENCIA' : hev.tipo_evento === 'salida' ? '📤 SALIDA' : '📥 ENTRADA'}
                          </span>
                          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                            <Clock size={12} />
                            {hev.estado === 'AUSENTE'
                              ? `Día Lectivo: ${formatDateDDMMYYYY(hev.fecha)}`
                              : `${formatDateDDMMYYYY(hev.timestamp)} ${new Date(hev.timestamp).toLocaleTimeString('es-CO', { timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-800">
                          {hev.estado === 'AUSENTE' ? `Grupo: ${hev.group_name || historyStudent.grado}` : `Ubicación: ${hev.reader_name || hev.reader_id}`}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium">
                          Origen: {hev.origen} {hev.sede ? `• Sede: ${hev.sede}` : ''}
                        </p>
                        {hev.observaciones && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-200/50">
                            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                              💬 Excusa / Novedad: {hev.observaciones}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-8 py-4 flex items-center justify-between">
              <Link 
                href={`/admin/attendance/students/${historyStudent.norm_id || historyStudent.id}`}
                className="text-xs font-bold text-fsm-blue hover:underline flex items-center gap-1"
              >
                📝 Abrir Administrador de Excusas Completo →
              </Link>
              <Link 
                href={buildFilterUrl()}
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

