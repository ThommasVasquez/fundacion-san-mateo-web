import { sql } from '@/lib/db';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { BookOpen, Users, Calendar, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { decrypt } from '@/lib/auth';
import { isColombiaHoliday } from '@/lib/colombiaHolidays';
import GroupAttendanceMatrix, { StudentData, SessionData, MatrixRecord } from './GroupAttendanceMatrix';

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

  if (sessionToken) {
    try {
      const payload = await decrypt(sessionToken);
      currentUserEmail = (payload?.email || '').toLowerCase().trim();
      canModifyAll = (
        currentUserEmail === 'admin@fundacionsanmateo.edu.co' ||
        currentUserEmail === 'admin@fundacionsanmateosoacha.edu.co'
      );
    } catch {
      canModifyAll = false;
    }
  }

  // 2. Query group details
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

  // 3. Query enrolled students in group
  const studentsQuery = await sql`
    SELECT s.id, s.nombre_original, s.documento as documento, s.estado
    FROM students_normalized s
    JOIN enrollments e ON e.student_id = s.id
    WHERE e.group_id = ${groupId}::uuid
      AND (e.activo IS NULL OR e.activo = TRUE)
      AND (s.estado IS NULL OR UPPER(s.estado) = 'ACTIVO')
    ORDER BY s.nombre_original ASC
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
      sn.id as student_id,
      (ae.timestamp AT TIME ZONE 'America/Bogota')::date::text as fecha_bogota,
      COUNT(ae.id) as scan_count
    FROM attendance_events ae
    LEFT JOIN students s ON s.id = ae.student_id
    LEFT JOIN students_normalized sn ON sn.id = ae.student_id OR UPPER(TRIM(sn.nombre_original)) = UPPER(TRIM(s.nombre))
    JOIN enrollments e ON e.student_id = sn.id
    WHERE e.group_id = ${groupId}::uuid
      AND ae.tipo_evento = 'entrada'
    GROUP BY sn.id, (ae.timestamp AT TIME ZONE 'America/Bogota')::date::text
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

  const records: MatrixRecord[] = [];
  students.forEach((st) => {
    sessions.forEach((sess) => {
      const explicit = explicitMap.get(`${st.id}_${sess.id}`);
      const hasRealScan = realScansSet.has(`${st.id}_${sess.fecha}`);
      const holiday = isColombiaHoliday(sess.fecha);
      const phoneFollowup = followupMap.get(`${st.id}_${sess.fecha}`);

      let finalEstado = 'PRESENTE';
      let finalObs = '';

      if (explicit) {
        finalEstado = explicit.estado;
        finalObs = explicit.observaciones || (phoneFollowup ? `Llamada: ${phoneFollowup}` : '');
      } else if (hasRealScan) {
        // Physical entry verified at torniquetes/panel
        finalEstado = 'PRESENTE';
        finalObs = phoneFollowup ? `Llamada: ${phoneFollowup}` : '';
      } else if (holiday.isHoliday) {
        finalEstado = 'FESTIVO';
        finalObs = holiday.holidayName || 'Festivo Nacional';
      } else if (isGroupCB && sess.fecha < '2026-09-01') {
        finalEstado = 'CALENDARIO_B';
      } else if (phoneFollowup) {
        // Justified telephone absence
        finalEstado = 'EXCUSA_MEDICA';
        finalObs = `Seguimiento: ${phoneFollowup}`;
      } else if (sess.fecha <= todayStr) {
        // Past or current date with no scan and no explicit record
        finalEstado = 'AUSENTE';
      } else {
        // Future dates default to regular state
        finalEstado = 'PRESENTE';
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
      />
    </div>
  );
}
