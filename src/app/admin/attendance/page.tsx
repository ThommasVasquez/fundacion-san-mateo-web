import React from 'react';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { 
  Users, UserCheck, AlertTriangle, HelpCircle, 
  Search, Calendar, Filter, ArrowLeft, Clock, ChevronRight, X, Tag, Upload, ArrowUpDown, Bell, BookOpen
} from 'lucide-react';
import RefreshButton from './RefreshButton';
import ExportCsvButton from './ExportCsvButton';
import ManualAttendanceModal from './ManualAttendanceModal';
import AttendanceFilters from './AttendanceFilters';
import StudentHistoryModal from './StudentHistoryModal';
import { getPendingAbsenceAlertsCount } from '@/app/actions';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';
import { isColombiaHoliday } from '@/lib/colombiaHolidays';


import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { userHasPermission } from '@/lib/permissions';

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
  const sessionToken = (await cookies()).get('session')?.value;
  let payload: any = null;
  if (sessionToken) {
    try {
      payload = await decrypt(sessionToken);
    } catch {}
  }
  const userRole = payload?.role || 'admin';
  const userEmail = (payload?.email || '').toLowerCase().trim();
  const canEditAttendance = userHasPermission('attendance_edit', userRole, payload?.permissions, userEmail);
  const canManageStudents = userHasPermission('students_manage', userRole, payload?.permissions, userEmail);

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

  const buildFilterUrl = (input?: string | Record<string, string>) => {
    const overrides: Record<string, string> = typeof input === 'string' ? { studentHistoryId: input } : (input || {});
    const p = new URLSearchParams();
    const sDate = overrides.startDate !== undefined ? overrides.startDate : filterStartDate;
    const eDate = overrides.endDate !== undefined ? overrides.endDate : filterEndDate;
    const searchVal = overrides.search !== undefined ? overrides.search : filterSearch;
    const gradoVal = overrides.grado !== undefined ? overrides.grado : filterGrado;
    const sedeVal = overrides.sede !== undefined ? overrides.sede : filterSede;
    const sortVal = overrides.sort !== undefined ? overrides.sort : filterSort;
    const studentHistId = overrides.studentHistoryId !== undefined ? overrides.studentHistoryId : (typeof input === 'string' ? input : historyStudentId);

    if (sDate) p.set('startDate', sDate);
    if (eDate) p.set('endDate', eDate);
    if (searchVal) p.set('search', searchVal);
    if (gradoVal) p.set('grado', gradoVal);
    if (sedeVal) p.set('sede', sedeVal);
    if (overrides.anomalyOnly === 'true' || (overrides.anomalyOnly === undefined && filterAnomalyOnly)) p.set('anomalyOnly', 'true');
    if (overrides.absencesOnly === 'true' || (overrides.absencesOnly === undefined && filterAbsencesOnly)) p.set('absencesOnly', 'true');
    if (sortVal) p.set('sort', sortVal);
    if (studentHistId) p.set('studentHistoryId', studentHistId);
    return `/admin/attendance?${p.toString()}`;
  };

  const currentHourBogota = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA, hour: 'numeric', hour12: false
  }).format(new Date()), 10);
  // El turno nocturno concluye a las 10:00 PM (hora 22). No marcar ausencias nocturnas mientras el turno esté en curso.
  const isNightShiftConcluded = currentHourBogota >= 22;

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
    alertsRes,
    sedesRes
  ] = await Promise.all([
    sql`
      SELECT count(*) FROM attendance_events 
      WHERE (timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
        AND (timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
    `,
    sql`
      SELECT count(*) FROM attendance_events ae
      LEFT JOIN students s ON (
        ae.student_id = s.id 
        OR (ae.student_id IS NULL AND ae.rfid_tag_uid IS NOT NULL AND s.rfid_tag_uid = ae.rfid_tag_uid)
      )
      WHERE ae.student_id IS NULL AND s.id IS NULL
        AND (ae.timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
        AND (ae.timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
    `,
    sql`
      SELECT count(DISTINCT COALESCE(ae.student_id, s.id)) FROM attendance_events ae
      LEFT JOIN students s ON (
        ae.student_id = s.id 
        OR (ae.student_id IS NULL AND ae.rfid_tag_uid IS NOT NULL AND s.rfid_tag_uid = ae.rfid_tag_uid)
      )
      WHERE (ae.student_id IS NOT NULL OR s.id IS NOT NULL)
        AND (ae.timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
        AND (ae.timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
    `,
    sql`SELECT count(*) FROM students WHERE activo = TRUE`,
    sql`SELECT DISTINCT grado FROM students WHERE grado IS NOT NULL ORDER BY grado`,
    sql`
      SELECT count(*) as count
      FROM students s
      JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
      JOIN groups g ON g.id = e.group_id
      JOIN class_sessions cs ON cs.group_id = g.id
      LEFT JOIN attendance_events ae ON ae.student_id = s.id 
        AND (ae.timestamp AT TIME ZONE 'America/Bogota')::date = cs.fecha
      LEFT JOIN attendance_records_normalized ar ON ar.session_id = cs.id AND ar.student_id = s.id
      WHERE s.activo = TRUE
        AND cs.fecha <= CURRENT_DATE
        AND cs.fecha >= ${filterStartDate}::date
        AND cs.fecha <= ${filterEndDate}::date
        AND ae.id IS NULL
        AND (ar.estado IS NULL OR ar.estado = 'AUSENTE')
        AND (cs.fecha >= '2026-09-01'::date OR g.nombre IS NULL OR UPPER(g.nombre) NOT LIKE '%CB%')
        AND (e.fecha_inicio IS NULL OR cs.fecha >= e.fecha_inicio)
        AND (
          cs.fecha < ${todayStr}::date 
          OR (g.jornada != 'SABADO' AND (g.jornada != 'NOCHE' OR ${isNightShiftConcluded}))
        )
        ${filterGrado ? sql`AND g.nombre = ${filterGrado}` : sql``}
        ${filterSede ? sql`AND ar.sede = ${filterSede}` : sql``}
    `,
    filterAbsencesOnly ? sql`
      SELECT 
        concat(s.id, '_', cs.id) as id,
        s.id as student_id,
        s.nombre as student_name,
        COALESCE(g.nombre, s.grado, 'Sin Grado') as student_grado,
        'sin_marcacion' as origen,
        'inasistencia' as tipo_evento,
        cs.fecha::text as timestamp,
        COALESCE(ar.sede, '') as sede,
        COALESCE(ar.observaciones, 'Sin marcación en torniquete') as observaciones,
        'AUSENTE' as estado,
        'Sin marcación de entrada' as reader_name
      FROM students s
      JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
      JOIN groups g ON g.id = e.group_id
      JOIN class_sessions cs ON cs.group_id = g.id
      LEFT JOIN attendance_events ae ON ae.student_id = s.id 
        AND (ae.timestamp AT TIME ZONE 'America/Bogota')::date = cs.fecha
      LEFT JOIN attendance_records_normalized ar ON ar.session_id = cs.id AND ar.student_id = s.id
      WHERE s.activo = TRUE
        AND cs.fecha <= CURRENT_DATE
        AND cs.fecha >= ${filterStartDate}::date
        AND cs.fecha <= ${filterEndDate}::date
        AND ae.id IS NULL
        AND (ar.estado IS NULL OR ar.estado = 'AUSENTE')
        AND (cs.fecha >= '2026-09-01'::date OR g.nombre IS NULL OR UPPER(g.nombre) NOT LIKE '%CB%')
        AND (e.fecha_inicio IS NULL OR cs.fecha >= e.fecha_inicio)
        AND (
          cs.fecha < ${todayStr}::date 
          OR (g.jornada != 'SABADO' AND (g.jornada != 'NOCHE' OR ${isNightShiftConcluded}))
        )
        ${filterGrado ? sql`AND g.nombre = ${filterGrado}` : sql``}
        ${filterSede ? sql`AND ar.sede = ${filterSede}` : sql``}
      ORDER BY cs.fecha DESC, s.nombre ASC
    ` : sql`
      SELECT 
        ae.id,
        COALESCE(ae.student_id, s.id) as student_id,
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
        COALESCE(g.nombre, s.grado, 'Sin Grado') as student_grado, 
        r.ubicacion as reader_name,
        r.tipo as reader_tipo
      FROM attendance_events ae
      LEFT JOIN students s ON (
        ae.student_id = s.id 
        OR (ae.student_id IS NULL AND ae.rfid_tag_uid IS NOT NULL AND s.rfid_tag_uid = ae.rfid_tag_uid)
      )
      LEFT JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
      LEFT JOIN groups g ON g.id = e.group_id
      LEFT JOIN readers r ON ae.reader_id = r.id
      WHERE (ae.timestamp AT TIME ZONE 'America/Bogota')::date >= ${filterStartDate}::date
        AND (ae.timestamp AT TIME ZONE 'America/Bogota')::date <= ${filterEndDate}::date
      ORDER BY ae.timestamp DESC
    `,
    sql`
      SELECT 
        s.id, 
        s.nombre, 
        COALESCE(g.nombre, s.grado, 'Sin Grado') as grado,
        s.activo
      FROM students s
      LEFT JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
      LEFT JOIN groups g ON g.id = e.group_id
      WHERE s.activo = TRUE
      ORDER BY s.nombre ASC
    `,
    sql`SELECT id, nombre, jornada FROM groups ORDER BY nombre`,
    getPendingAbsenceAlertsCount(),
    sql`
      SELECT DISTINCT sede FROM (
        SELECT sede FROM attendance_events WHERE sede IS NOT NULL AND sede != ''
        UNION
        SELECT sede FROM readers WHERE sede IS NOT NULL AND sede != ''
        UNION
        SELECT sede FROM teachers WHERE sede IS NOT NULL AND sede != ''
        UNION
        SELECT sede FROM admin_users WHERE sede IS NOT NULL AND sede != ''
      ) s
      ORDER BY sede
    `
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
    if (filterGrado) {
      const matchGrado = ev.student_grado === filterGrado ||
        (filterGrado === 'II DIURNO CB' && ev.student_grado === 'II DIURNO A CB') ||
        (filterGrado === 'II DIURNO A CB' && ev.student_grado === 'II DIURNO CB');
      if (!matchGrado) return false;
    }
    if (filterSede && (ev.sede || '') !== filterSede) return false;
    if (filterAnomalyOnly && !ev.isAnomaly) return false;
    if (filterSearch) {
      const nameMatch = (ev.student_name || 'Tarjeta no asignada').toLowerCase().includes(searchLower);
      const gradoMatch = (ev.student_grado || '').toLowerCase().includes(searchLower) ||
        (searchLower.includes('ii diurno cb') && (ev.student_grado || '').toLowerCase().includes('ii diurno a cb'));
      const uidMatch = (ev.rfid_tag_uid || '').toLowerCase().includes(searchLower);
      const readerMatch = (ev.reader_name || ev.reader_id || '').toLowerCase().includes(searchLower);
      const sedeMatch = (ev.sede || '').toLowerCase().includes(searchLower);
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
    const stRes = await sql`
      SELECT 
        s.id, 
        s.nombre, 
        COALESCE(g.nombre, s.grado, 'Sin Grado') as grado, 
        s.activo,
        s.rfid_tag_uid,
        g.id as group_id,
        e.fecha_inicio as enrollment_fecha_inicio
      FROM students s
      LEFT JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
      LEFT JOIN groups g ON g.id = e.group_id
      WHERE s.id = ${historyStudentId}::uuid
      LIMIT 1
    `;

    if (stRes.length > 0) {
      historyStudent = stRes[0];
    }

    if (historyStudent) {
      const targetStudentId = historyStudent.id;
      const isStudentFrozen = historyStudent.activo === false;

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
          AND (e.activo IS NULL OR e.activo = TRUE)
          AND cs.fecha <= CURRENT_DATE
        ORDER BY cs.fecha DESC
        LIMIT 60
      `;

      // 2. Query RFID events
      const rfidScans = await sql`
        SELECT ae.*, r.ubicacion as reader_name
        FROM attendance_events ae
        LEFT JOIN readers r ON ae.reader_id = r.id
        WHERE ae.student_id = ${targetStudentId}::uuid
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
          const holiday = isColombiaHoliday(fStr);
          const isGroupCB = (sess.group_name || '').toUpperCase().includes('CB');

          let estado = isStudentFrozen ? 'CONGELADO' : (fStr > todayStr ? 'PENDIENTE' : 'AUSENTE');
          let tipo_evento = isStudentFrozen ? 'congelado' : (fStr > todayStr ? 'pendiente' : 'inasistencia');
          let reader_name = isStudentFrozen ? 'Estudiante en congelamiento' : (fStr > todayStr ? 'Sesión programada a futuro' : 'Sin marcación de entrada');
          let origen = fStr > todayStr ? 'Calendario Institucional' : 'Sistema';
          let timestamp = fStr;
          let observaciones = isStudentFrozen ? 'Estudiante congelado/inactivo' : (fStr > todayStr ? 'Programada' : '');
          let sede = '';

          if (ov) {
            estado = ov.estado;
            tipo_evento = ov.estado.toLowerCase();
            observaciones = ov.observaciones || '';
            sede = ov.sede || '';

            if (ov.estado === 'LIBRE') {
              reader_name = 'Día Libre / No Lectivo Programado';
              origen = 'Calendario Institucional';
            } else if (ov.estado === 'FESTIVO') {
              reader_name = 'Festivo Nacional';
              origen = 'Calendario Nacional';
            } else if (ov.estado === 'NO_HUBO_CLASE') {
              reader_name = 'Clase no dictada / Cancelada';
              origen = 'Planilla Oficial';
            } else if (ov.estado === 'COMITE_ACADEMICO') {
              reader_name = 'Comité Académico Institucional';
              origen = 'Institucional';
            } else if (ov.estado === 'PRACTICAS') {
              reader_name = 'Prácticas Clínicas';
              origen = 'Planilla Oficial';
            } else if (ov.estado === 'CALENDARIO_B') {
              reader_name = 'Calendario B (Inicio en Septiembre)';
              origen = 'Planilla Oficial';
            } else if (ov.estado === 'PRESENTE') {
              if (rfid) {
                tipo_evento = rfid.tipo_evento || 'entrada';
                reader_name = rfid.reader_name || rfid.reader_id || 'Torniquete / Lector Fijo';
                origen = rfid.origen === 'movil_profesor' ? 'Dispositivo Móvil' : 'Lector Fijo';
                timestamp = rfid.timestamp;
              } else {
                tipo_evento = 'presente';
                reader_name = 'Asistencia registrada en aula';
                origen = 'Planilla Docente';
              }
            } else if (ov.estado === 'AUSENTE') {
              tipo_evento = 'inasistencia';
              reader_name = 'Inasistencia a clase (Sin justificar)';
              origen = 'Planilla Docente';
            }
          } else if (holiday.isHoliday) {
            estado = 'FESTIVO';
            tipo_evento = 'festivo';
            reader_name = holiday.holidayName || 'Festivo Nacional';
            origen = 'Calendario Nacional';
            observaciones = holiday.holidayName || 'Festivo Nacional';
          } else if (isGroupCB && fStr < '2026-09-01') {
            estado = 'CALENDARIO_B';
            tipo_evento = 'calendario_b';
            reader_name = 'Calendario B (Inicio en Septiembre)';
            origen = 'Calendario Institucional';
            observaciones = 'Calendario B';
          } else if (rfid) {
            estado = 'PRESENTE';
            tipo_evento = rfid.tipo_evento;
            reader_name = rfid.reader_name || rfid.reader_id || 'Torniquete';
            origen = rfid.origen === 'movil_profesor' ? 'Dispositivo Móvil' : 'Lector Fijo';
            timestamp = rfid.timestamp;
            observaciones = rfid.observaciones || '';
            sede = rfid.sede || '';
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
  const availableSedes: string[] = sedesRes.map((r: any) => r.sede).filter(Boolean);

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
          {canEditAttendance && (
            <ManualAttendanceModal 
              students={allStudentsForManual.map((s: any) => ({
                id: s.id,
                nombre: s.nombre,
                grado: s.grado,
                activo: Boolean(s.activo)
              }))} 
              sedes={availableSedes}
            />
          )}
          <ExportCsvButton events={filteredEvents} startDate={filterStartDate} endDate={filterEndDate} />
          {canManageStudents && (
            <Link
              href="/admin/attendance/import"
              className="px-5 py-2.5 bg-white text-fsm-blue border border-fsm-blue/20 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-blue hover:text-white transition-all shadow-sm flex items-center gap-2"
            >
              <Upload size={14} /> Subir Alumnos
            </Link>
          )}
          <Link
            href="/admin/attendance/alerts"
            className="px-5 py-2.5 bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-600 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
          >
            <BookOpen size={14} /> Planillas y Alertas por Grupo
          </Link>
          {canManageStudents && (
            <Link
              href="/admin/attendance/enrollment"
              className="px-5 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-sm flex items-center gap-2"
            >
              <Users size={14} /> Gestión y Edición de Estudiantes
            </Link>
          )}
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

      {/* Interactive Filters with Instant Auto-Apply */}
      <AttendanceFilters 
        filterSearch={filterSearch}
        filterStartDate={filterStartDate}
        filterEndDate={filterEndDate}
        filterSede={filterSede}
        filterGrado={filterGrado}
        filterSort={filterSort}
        filterAnomalyOnly={filterAnomalyOnly}
        filterAbsencesOnly={filterAbsencesOnly}
        todayStr={todayStr}
        grades={grades}
        sedes={availableSedes}
        totalAnomalies={totalAnomalies}
        totalRealAbsencesCount={totalRealAbsencesCount}
        absencesListLength={filteredEvents.length}
      />

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
                        {ev.sede ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-blue-50 text-fsm-blue px-2 py-0.5 rounded-md border border-blue-200">
                            🏫 {ev.sede}
                          </span>
                        ) : null}
                        <p className="font-bold text-gray-800 text-xs">{ev.reader_name || 'Lector Entrada'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        ev.estado === 'AUSENTE' || ev.origen === 'sin_marcacion'
                          ? 'bg-red-50 text-red-700 border-red-200 font-black'
                          : ev.origen === 'manual'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : ev.origen === 'movil_profesor'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {ev.estado === 'AUSENTE' || ev.origen === 'sin_marcacion'
                          ? '🚫 Sin Marcación'
                          : ev.origen === 'manual'
                          ? '✏️ Manual'
                          : ev.origen === 'movil_profesor'
                          ? '📱 Móvil'
                          : '🖥️ Panel Fijo'}
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
                      ) : canManageStudents ? (
                        <Link 
                          href={`/admin/attendance/enrollment?pendingUid=${ev.rfid_tag_uid}`}
                          className="px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-100 hover:bg-yellow-500 hover:text-white transition-all text-xs font-bold rounded-lg"
                        >
                          Asignar
                        </Link>
                      ) : (
                        <span className="px-2.5 py-1 text-gray-400 text-xs font-medium">
                          Sin Asignar
                        </span>
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
        <StudentHistoryModal
          historyStudent={historyStudent}
          historyEvents={historyEvents}
          closeUrl={buildFilterUrl({ studentHistoryId: '' })}
        />
      )}
    </div>
  );
}

