import '@/lib/polyfill';
import { sql } from '@/lib/db';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { BookOpen, Users, Calendar, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { decrypt } from '@/lib/auth';
import { isColombiaHoliday } from '@/lib/colombiaHolidays';
import { userHasPermission, isSuperAdminEmail } from '@/lib/permissions';
import GroupAttendanceMatrix, { StudentData, SessionData, MatrixRecord } from './GroupAttendanceMatrix';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export default async function GroupAttendancePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  // 1. User Session and Permissions Check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  let currentUserEmail = '';
  let canModifyAll = false;
  let canEditTotalClasses = false;

  if (sessionToken) {
    try {
      const payload = await decrypt(sessionToken);
      currentUserEmail = (payload?.email || '').toLowerCase().trim();
      
      const canView = (
        isSuperAdminEmail(currentUserEmail) ||
        payload?.role === 'admin' ||
        (Array.isArray(payload?.permissions) && (
          payload.permissions.includes('attendance_view') || 
          payload.permissions.includes('attendance_edit')
        )) ||
        payload?.role === 'academic' ||
        payload?.role === 'coordinator' ||
        payload?.role === 'teacher'
      );

      if (!canView) {
        redirect('/admin');
      }

      canModifyAll = (
        isSuperAdminEmail(currentUserEmail) ||
        payload?.role === 'admin' ||
        (Array.isArray(payload?.permissions) && payload.permissions.includes('attendance_edit')) ||
        (payload?.role === 'academic' && (!payload?.permissions || payload.permissions.includes('attendance_edit')))
      );

      canEditTotalClasses = (
        isSuperAdminEmail(currentUserEmail) ||
        payload?.role === 'admin' ||
        userHasPermission('attendance_edit_total_classes', payload?.role, payload?.permissions, currentUserEmail)
      );
    } catch {
      canModifyAll = false;
      canEditTotalClasses = false;
    }
  }

  // Asegurar columnas en BD si no existen
  await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS total_clases INTEGER;`.catch(() => []);
  await sql`ALTER TABLE academic_programs ADD COLUMN IF NOT EXISTS total_clases INTEGER;`.catch(() => []);

  // 2. Query group details
  const groupQuery = await sql`
    SELECT id, nombre, jornada, tipo, programa_codigo, programa_nombre, total_clases
    FROM groups
    WHERE id = ${groupId}::uuid
    LIMIT 1
  `;

  if (groupQuery.length === 0) {
    notFound();
  }

  const group = groupQuery[0];

  // 2.1 Query program default total classes if available
  let defaultProgramTotalClasses: number | null = null;
  let programTitle = group.programa_nombre || '';
  if (group.programa_codigo || group.programa_nombre) {
    try {
      const progQuery = await sql`
        SELECT id, title, total_clases 
        FROM academic_programs 
        WHERE (
          UPPER(title) ILIKE ${'%' + (group.programa_nombre || group.programa_codigo) + '%'}
          OR (details IS NOT NULL AND details::text ILIKE ${'%' + (group.programa_codigo || '') + '%'})
        )
        ORDER BY total_clases DESC NULLS LAST
        LIMIT 1
      `;
      if (progQuery && progQuery.length > 0) {
        if (progQuery[0].total_clases) {
          defaultProgramTotalClasses = Number(progQuery[0].total_clases);
        }
        if (progQuery[0].title) {
          programTitle = progQuery[0].title;
        }
      }
    } catch (e) {
      console.warn('Error fetching program total classes:', e);
    }
  }

  // 3. Query enrolled students in group
  const studentsQuery = await sql`
    SELECT 
      COALESCE(s.id, sn.id, e.student_id) as id,
      COALESCE(s.nombre, sn.nombre_original, 'ESTUDIANTE') as nombre_original,
      COALESCE(s.documento, sn.documento, '') as documento,
      CASE 
        WHEN s.id IS NOT NULL THEN (CASE WHEN s.activo IS FALSE THEN 'INACTIVO' ELSE 'ACTIVO' END)
        WHEN sn.estado IS NOT NULL THEN sn.estado
        ELSE 'ACTIVO'
      END as estado
    FROM enrollments e
    LEFT JOIN students s ON s.id = e.student_id
    LEFT JOIN students_normalized sn ON sn.id = e.student_id
    WHERE e.group_id = ${groupId}::uuid
      AND (e.activo IS NULL OR e.activo = TRUE)
      AND (s.id IS NOT NULL OR sn.id IS NOT NULL)
      AND (
        (s.id IS NOT NULL AND (s.activo IS NULL OR s.activo = TRUE))
        OR (s.id IS NULL AND (sn.estado IS NULL OR UPPER(sn.estado) = 'ACTIVO'))
      )
    ORDER BY COALESCE(s.nombre, sn.nombre_original) ASC
  `;

  // 4. Query all class sessions for this group (ordered chronologically)
  const sessionsQuery = await sql`
    SELECT id, fecha::text as fecha, dia_semana_texto
    FROM class_sessions
    WHERE group_id = ${groupId}::uuid
    ORDER BY fecha ASC
  `;

  // 5. Query explicit attendance records for these sessions
  const recordsQuery = await sql`
    SELECT ar.student_id, ar.session_id, cs.fecha::text as fecha, ar.estado, ar.observaciones
    FROM attendance_records_normalized ar
    JOIN class_sessions cs ON cs.id = ar.session_id
    WHERE cs.group_id = ${groupId}::uuid
  `;

  // 6. Query real physical gate entries from attendance_events (torniquetes and RFID panel scans)
  const realScansQuery = await sql`
    SELECT 
      ae.student_id::text as student_id,
      (ae.timestamp AT TIME ZONE 'America/Bogota')::date::text as fecha_bogota,
      COUNT(ae.id) as scan_count
    FROM attendance_events ae
    WHERE ae.student_id IN (
      SELECT student_id 
      FROM enrollments 
      WHERE group_id = ${groupId}::uuid 
        AND (activo IS NULL OR activo = TRUE)
    )
    GROUP BY ae.student_id, (ae.timestamp AT TIME ZONE 'America/Bogota')::date::text
  `;

  const realScansSet = new Set<string>();
  realScansQuery.forEach((s: any) => {
    if (s.student_id && s.fecha_bogota) {
      realScansSet.add(`${s.student_id}_${s.fecha_bogota}`);
    }
  });

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const students: StudentData[] = studentsQuery.map((s: any) => ({
    id: s.id,
    nombre_original: s.nombre_original,
    documento: s.documento || '',
    estado: s.estado || 'ACTIVO',
  }));

  const sessions: SessionData[] = sessionsQuery.map((s: any) => ({
    id: s.id,
    fecha: s.fecha,
    dia_semana_texto: s.dia_semana_texto || 'CLASE',
  }));

  // Reconcile records map with real physical entries from attendance_events
  const explicitMap = new Map<string, { estado: string; observaciones: string }>();
  recordsQuery.forEach((r: any) => {
    explicitMap.set(`${r.student_id}_${r.session_id}`, {
      estado: r.estado,
      observaciones: r.observaciones || '',
    });
  });

  // 5.1 Query absence followups (phone calls / excuses) for students in this group
  const followupsQuery = await sql`
    SELECT af.student_id, af.fecha::text as fecha, af.comentarios, af.estado_llamada
    FROM absence_followups af
    JOIN enrollments e ON e.student_id = af.student_id
    WHERE e.group_id = ${groupId}::uuid
      AND (af.comentarios IS NOT NULL AND af.comentarios != '')
  `;
  const followupMap = new Map<string, string>();
  followupsQuery.forEach((f: any) => {
    followupMap.set(`${f.student_id}_${f.fecha}`, f.comentarios);
  });

  const isGroupCB = (group.nombre || '').toUpperCase().includes('CB');

  const currentHourBogota = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', hour: 'numeric', hour12: false
  }).format(new Date()), 10);

  const jName = (group.jornada || '').toUpperCase();
  const isNight = jName.includes('NOCHE');
  const isMorning = jName.includes('DIURN') || jName.includes('MAÑ');
  const isAfternoon = jName.includes('TARD');
  const isSaturday = jName.includes('SAB') || jName.includes('SÁB');

  // Determinar si la jornada de hoy ya concluyó en su horario
  let isShiftConcluded = false;
  if (isNight) {
    isShiftConcluded = currentHourBogota >= 22;
  } else if (isMorning) {
    isShiftConcluded = currentHourBogota >= 13; // Turno diurno concluye a la 1:00 PM
  } else if (isAfternoon) {
    isShiftConcluded = currentHourBogota >= 18;
  } else if (isSaturday) {
    isShiftConcluded = currentHourBogota >= 15;
  } else {
    isShiftConcluded = currentHourBogota >= 21;
  }

  const records: MatrixRecord[] = [];
  students.forEach((st) => {
    sessions.forEach((sess) => {
      const explicit = explicitMap.get(`${st.id}_${sess.id}`);
      const hasRealScan = realScansSet.has(`${st.id}_${sess.fecha}`);
      const holiday = isColombiaHoliday(sess.fecha);
      const phoneFollowup = followupMap.get(`${st.id}_${sess.fecha}`);
      let finalEstado = 'PRESENTE';
      let finalObs = '';

      if (sess.fecha > todayStr) {
        finalEstado = 'PENDIENTE';
        finalObs = 'Clase programada a futuro';
      } else if (sess.fecha === todayStr) {
        // Día de hoy en curso: no asumir fallas mientras el turno no concluya
        if (explicit && explicit.estado !== 'AUSENTE' && explicit.estado !== 'PRESENTE') {
          finalEstado = explicit.estado;
          finalObs = explicit.observaciones || '';
        } else if (holiday.isHoliday) {
          finalEstado = 'FESTIVO';
          finalObs = holiday.holidayName || 'Festivo Nacional';
        } else if (hasRealScan) {
          finalEstado = 'PRESENTE';
          finalObs = 'Ingreso registrado en torniquete';
        } else if (explicit && explicit.observaciones && explicit.observaciones.trim() !== '') {
          finalEstado = explicit.estado;
          finalObs = explicit.observaciones;
        } else if (!isShiftConcluded) {
          finalEstado = 'PENDIENTE';
          finalObs = isNight && currentHourBogota < 18 
            ? 'Jornada nocturna pendiente de inicio (6:00 PM)' 
            : 'Jornada en curso • En espera de asistencia';
        } else {
          finalEstado = 'AUSENTE';
          finalObs = 'Sin registro de ingreso en torniquete';
        }
      } else {
        // Fechas pasadas (sess.fecha < todayStr)
        if (explicit) {
          finalEstado = explicit.estado;
          finalObs = explicit.observaciones || '';
        } else if (holiday.isHoliday) {
          finalEstado = 'FESTIVO';
          finalObs = holiday.holidayName || 'Festivo Nacional';
        } else if (isGroupCB && sess.fecha < '2026-09-01') {
          finalEstado = 'CALENDARIO_B';
        } else if (hasRealScan) {
          finalEstado = 'PRESENTE';
          finalObs = 'Ingreso registrado en torniquete';
        } else {
          finalEstado = 'AUSENTE';
          finalObs = 'Sin registro de ingreso en torniquete';
        }
      }

      // If there was a phone followup registered for this student on this date, show it
      if (phoneFollowup && finalEstado === 'AUSENTE') {
        finalObs = finalObs ? `${finalObs} | Seguimiento: ${phoneFollowup}` : `Seguimiento: ${phoneFollowup}`;
      }

      records.push({
        student_id: st.id,
        session_id: sess.id,
        fecha: sess.fecha,
        estado: finalEstado,
        observaciones: finalObs,
      });
    });
  });

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 space-y-8">
      {/* Header Navigation */}
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-fsm-blue uppercase tracking-tight">
                  GRUPO: {group.nombre}
                </h1>
                {canModifyAll ? (
                  <span className="bg-amber-100 text-amber-900 font-black px-2.5 py-0.5 rounded-lg border border-amber-300 text-[10px] uppercase flex items-center gap-1">
                    <ShieldCheck size={12} /> Admin Total
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-700 font-black px-2.5 py-0.5 rounded-lg border border-gray-300 text-[10px] uppercase flex items-center gap-1">
                    <Lock size={12} /> Solo Excusas Médicas
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Jornada {group.jornada} • Tipo {group.tipo}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-emerald-50 text-emerald-700 font-bold px-4 py-2 rounded-2xl border border-emerald-200 text-xs">
            👥 {students.length} Estudiantes Matriculados
          </span>
          <span className="bg-blue-50 text-fsm-blue font-bold px-4 py-2 rounded-2xl border border-blue-200 text-xs">
            📅 {sessions.length} Fechas Cotejadas
          </span>
        </div>
      </div>

      {/* Interactive Matrix Component */}
      <GroupAttendanceMatrix
        groupId={group.id}
        groupName={group.nombre}
        jornada={group.jornada}
        tipo={group.tipo}
        students={students}
        sessions={sessions}
        records={records}
        canModifyAll={canModifyAll}
        currentUserEmail={currentUserEmail}
        initialTotalClasses={group.total_clases ?? null}
        defaultProgramTotalClasses={defaultProgramTotalClasses}
        programName={programTitle}
        canEditTotalClasses={canEditTotalClasses}
      />
    </div>
  );
}
