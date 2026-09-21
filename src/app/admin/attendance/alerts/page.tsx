import Link from 'next/link';
import { AlertTriangle, Users, BookOpen, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { sql } from '@/lib/db';
import StudentAlertsTable from './StudentAlertsTable';
import MultiEnrollmentManager from './MultiEnrollmentManager';
import CreateGroupButton from '../CreateGroupButton';
import { getColombiaHolidays } from '@/lib/colombiaHolidays';

export const revalidate = 0;

export default async function AttendanceAlertsPage() {
  const currentYear = new Date().getFullYear();
  const holidays = getColombiaHolidays(currentYear).map(h => h.dateStr);

  // Parallel queries: real absenteeism based on actual turnstile scans and justified excuses
  const [groupStatsQuery, studentAlertsQuery] = await Promise.all([
    sql`
      WITH real_scans AS (
        SELECT DISTINCT 
          ae.student_id, 
          (ae.timestamp AT TIME ZONE 'America/Bogota')::date::text as scan_date
        FROM attendance_events ae
        WHERE ae.student_id IS NOT NULL
      ),
      student_sessions AS (
        SELECT 
          s.id as student_id,
          s.nombre as student_name,
          g.id as group_id,
          g.nombre as group_name,
          g.jornada,
          g.tipo,
          cs.id as session_id,
          cs.fecha::text as fecha,
          CASE 
            WHEN ar.estado IS NOT NULL THEN ar.estado
            WHEN rs.scan_date IS NOT NULL THEN 'PRESENTE'
            WHEN cs.fecha = CURRENT_DATE THEN 'PENDIENTE'
            ELSE 'AUSENTE'
          END as final_estado
        FROM groups g
        JOIN enrollments e ON e.group_id = g.id AND (e.activo IS NULL OR e.activo = TRUE)
        JOIN students s ON s.id = e.student_id AND s.activo = TRUE
        JOIN class_sessions cs ON cs.group_id = g.id AND cs.fecha <= CURRENT_DATE
        LEFT JOIN real_scans rs ON rs.student_id = s.id AND rs.scan_date = cs.fecha::text
        LEFT JOIN attendance_records_normalized ar ON ar.session_id = cs.id AND ar.student_id = s.id
        WHERE cs.fecha::text != ALL(${holidays}::text[])
          AND (
            NOT (g.nombre ILIKE '%CB%' OR g.tipo = 'CALENDARIO_B') 
            OR cs.fecha >= '2026-09-01'
          )
          AND (e.fecha_inicio IS NULL OR cs.fecha >= e.fecha_inicio)
      ),
      group_agg AS (
        SELECT 
          group_id,
          COUNT(DISTINCT student_id) as total_students,
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(*) FILTER (WHERE final_estado = 'AUSENTE') as total_absences,
          COUNT(*) FILTER (WHERE final_estado IN ('PRESENTE', 'AUSENTE', 'EXCUSA_MEDICA', 'EXCUSA_PRACTICAS_AIPI', 'PRACTICAS')) as total_records
        FROM student_sessions
        GROUP BY group_id
      )
      SELECT 
        g.id as group_id,
        g.nombre as group_name,
        g.jornada,
        g.tipo,
        COALESCE(ga.total_students, 0) as total_students,
        COALESCE(ga.total_sessions, 0) as total_sessions,
        COALESCE(ga.total_absences, 0) as total_absences,
        COALESCE(ga.total_records, 0) as total_records
      FROM groups g
      LEFT JOIN group_agg ga ON ga.group_id = g.id
      ORDER BY g.nombre ASC
    `,
    sql`
      WITH real_scans AS (
        SELECT DISTINCT 
          ae.student_id, 
          (ae.timestamp AT TIME ZONE 'America/Bogota')::date::text as scan_date
        FROM attendance_events ae
        WHERE ae.student_id IS NOT NULL
      ),
      student_sessions AS (
        SELECT 
          s.id as student_id,
          s.nombre as student_name,
          g.id as group_id,
          g.nombre as group_name,
          cs.id as session_id,
          cs.fecha::text as fecha,
          CASE 
            WHEN ar.estado IS NOT NULL THEN ar.estado
            WHEN rs.scan_date IS NOT NULL THEN 'PRESENTE'
            WHEN cs.fecha = CURRENT_DATE THEN 'PENDIENTE'
            ELSE 'AUSENTE'
          END as final_estado
        FROM students s
        JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
        JOIN groups g ON g.id = e.group_id
        JOIN class_sessions cs ON cs.group_id = g.id AND cs.fecha <= CURRENT_DATE
        LEFT JOIN real_scans rs ON rs.student_id = s.id AND rs.scan_date = cs.fecha::text
        LEFT JOIN attendance_records_normalized ar ON ar.session_id = cs.id AND ar.student_id = s.id
        WHERE s.activo = TRUE
          AND cs.fecha::text != ALL(${holidays}::text[])
          AND (
            NOT (g.nombre ILIKE '%CB%' OR g.tipo = 'CALENDARIO_B') 
            OR cs.fecha >= '2026-09-01'
          )
          AND (e.fecha_inicio IS NULL OR cs.fecha >= e.fecha_inicio)
      )
      SELECT 
        student_id,
        student_name,
        group_name,
        group_id,
        COUNT(*) FILTER (WHERE final_estado IN ('PRESENTE', 'AUSENTE', 'EXCUSA_MEDICA', 'EXCUSA_PRACTICAS_AIPI', 'PRACTICAS')) as total_sessions,
        COUNT(*) FILTER (WHERE final_estado = 'AUSENTE') as total_absences,
        COUNT(*) FILTER (WHERE final_estado = 'PRESENTE') as total_presents,
        ROUND(
          (COUNT(*) FILTER (WHERE final_estado = 'AUSENTE')::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE final_estado IN ('PRESENTE', 'AUSENTE', 'EXCUSA_MEDICA', 'EXCUSA_PRACTICAS_AIPI', 'PRACTICAS')), 0)) * 100, 1
        ) as absence_rate
      FROM student_sessions
      GROUP BY student_id, student_name, group_name, group_id
      HAVING (
        (COUNT(*) FILTER (WHERE final_estado = 'AUSENTE')::numeric / 
         NULLIF(COUNT(*) FILTER (WHERE final_estado IN ('PRESENTE', 'AUSENTE', 'EXCUSA_MEDICA', 'EXCUSA_PRACTICAS_AIPI', 'PRACTICAS')), 0)) * 100 > 15
        OR COUNT(*) FILTER (WHERE final_estado = 'AUSENTE') >= 3
      )
      ORDER BY absence_rate DESC, total_absences DESC
      LIMIT 150
    `,
  ]);

  // Multi-enrollment students query with full group and schedule data
  const allGroupsQuery = await sql`
    SELECT id, nombre, jornada, tipo, programa_nombre
    FROM groups
    ORDER BY programa_nombre ASC, nombre ASC
  `;

  const multiEnrollmentRows = await sql`
    SELECT 
      s.id as student_id,
      s.nombre as student_name,
      s.documento,
      s.grado as student_grado,
      e.id as enrollment_id,
      e.activo as enrollment_activo,
      g.id as group_id,
      g.nombre as group_name,
      g.jornada,
      g.tipo,
      g.programa_nombre
    FROM students s
    JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
    JOIN groups g ON g.id = e.group_id
    WHERE s.id IN (
      SELECT student_id 
      FROM enrollments 
      WHERE (activo IS NULL OR activo = TRUE)
      GROUP BY student_id 
      HAVING COUNT(DISTINCT group_id) > 1 OR COUNT(id) > 1
    )
    ORDER BY s.nombre ASC, g.nombre ASC
  `;

  // Group rows by student
  const studentMap = new Map<string, any>();
  for (const row of multiEnrollmentRows) {
    if (!studentMap.has(row.student_id)) {
      studentMap.set(row.student_id, {
        student_id: row.student_id,
        student_name: row.student_name,
        documento: row.documento || null,
        student_grado: row.student_grado || null,
        enrollments: []
      });
    }
    studentMap.get(row.student_id).enrollments.push({
      enrollment_id: row.enrollment_id,
      group_id: row.group_id,
      group_name: row.group_name,
      jornada: row.jornada,
      tipo: row.tipo,
      programa_nombre: row.programa_nombre
    });
  }
  const multiEnrollmentStudents = Array.from(studentMap.values());

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
        <div className="flex flex-wrap items-center gap-3">
          <CreateGroupButton />
          <Link
            href="/admin/attendance"
            className="px-4 py-2.5 bg-white text-fsm-blue border border-gray-200 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
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
            <p className="text-3xl font-black text-fsm-blue mt-1">{multiEnrollmentStudents.length}</p>
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

        <StudentAlertsTable alerts={studentAlertsQuery as any} />
      </div>

      {/* Section 2: Group Summary Cards */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight">
              RESUMEN CONSOLIDADO POR GRUPO / JORNADA
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Indicadores generales de asistencia por cada curso oficial registrado.
            </p>
          </div>
          <CreateGroupButton variant="secondary" label="➕ Crear Nuevo Curso" />
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

      {/* Section 3: Multi-Enrollment Students Manager */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight flex items-center gap-2">
              <span className="text-purple-600">🔀</span> ESTUDIANTES CON MULTIMATRÍCULA / TRANSFERENCIAS ({multiEnrollmentStudents.length})
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Estudiantes que figuran en más de un grupo/jornada. Aquí puedes eliminar cursos obsoletos, editar el curso y horario, o unificarlos con un solo clic.
            </p>
          </div>
        </div>

        <MultiEnrollmentManager 
          initialStudents={multiEnrollmentStudents} 
          allGroups={allGroupsQuery as any} 
        />
      </div>
    </div>
  );
}
