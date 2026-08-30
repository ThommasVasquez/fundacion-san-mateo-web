import { sql } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Users, Calendar, ArrowLeft } from 'lucide-react';
import GroupAttendanceMatrix, { StudentData, SessionData, MatrixRecord } from './GroupAttendanceMatrix';

export const revalidate = 0;

export default async function GroupAttendancePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  // 1. Query group details
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

  // 2. Query enrolled students in group
  const studentsQuery = await sql`
    SELECT s.id, s.nombre_original, s.documento_identidad as documento, s.estado
    FROM students_normalized s
    JOIN enrollments e ON e.student_id = s.id
    WHERE e.group_id = ${groupId}::uuid
      AND (e.activo IS NULL OR e.activo = TRUE)
      AND (s.estado IS NULL OR UPPER(s.estado) = 'ACTIVO')
    ORDER BY s.nombre_original ASC
  `;

  // 3. Query all class sessions for this group (ordered chronologically)
  const sessionsQuery = await sql`
    SELECT id, fecha::text as fecha, dia_semana_texto
    FROM class_sessions
    WHERE group_id = ${groupId}::uuid
    ORDER BY fecha ASC
  `;

  // 4. Query all attendance records for these sessions
  const recordsQuery = await sql`
    SELECT ar.student_id, ar.session_id, cs.fecha::text as fecha, ar.estado, ar.observaciones
    FROM attendance_records_normalized ar
    JOIN class_sessions cs ON cs.id = ar.session_id
    WHERE cs.group_id = ${groupId}::uuid
  `;

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

  const records: MatrixRecord[] = recordsQuery.map((r: any) => ({
    student_id: r.student_id,
    session_id: r.session_id,
    fecha: r.fecha,
    estado: r.estado,
    observaciones: r.observaciones || '',
  }));

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
          <span className="bg-emerald-50 text-emerald-700 font-bold px-4 py-2 rounded-2xl border border-emerald-200 text-xs">
            👥 {students.length} Estudiantes Matriculados
          </span>
          <span className="bg-blue-50 text-fsm-blue font-bold px-4 py-2 rounded-2xl border border-blue-200 text-xs">
            📅 {sessions.length} Fechas en Matriz
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
      />
    </div>
  );
}
