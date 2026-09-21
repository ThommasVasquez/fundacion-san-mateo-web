import React from 'react';
import Link from 'next/link';
import { sql } from '@/lib/db';
import EnrollmentClient from './EnrollmentClient';
import CreateGroupButton from '../CreateGroupButton';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { userHasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface EnrollmentPageProps {
  searchParams: Promise<{
    pendingUid?: string;
  }>;
}

export default async function EnrollmentPage({ searchParams }: EnrollmentPageProps) {
  const sessionToken = (await cookies()).get('session')?.value;
  let payload: any = null;
  if (sessionToken) {
    try {
      payload = await decrypt(sessionToken);
    } catch {
      payload = null;
    }
  }

  if (!payload || (!payload.adminId && !payload.teacherId)) {
    redirect('/auth/login');
  }

  const userEmail = (payload.email || '').toLowerCase().trim();
  const hasAccess = userHasPermission('students_manage', payload.role, payload.permissions, userEmail);
  if (!hasAccess) {
    redirect('/admin/attendance');
  }

  const params = await searchParams;
  const pendingUid = params.pendingUid || '';

  // 1. Fetch all students with their active group enrollment and complete institutional profile
  try {
    await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT`;
    await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
  } catch {}

  const students = await sql`
    SELECT s.id, s.nombre, s.documento, s.usuario_nro, s.grado, s.rfid_tag_uid, s.tarjeta_numero, s.activo,
           s.telefono, s.email, s.domicilio, s.departamento, s.sede, s.cumpleanos, s.inicio_practicas,
           g.id as group_id, g.nombre as grupo_matriculado, e.activo as matricula_activa
    FROM students s
    LEFT JOIN enrollments e ON e.student_id = s.id AND (e.activo IS NULL OR e.activo = TRUE)
    LEFT JOIN groups g ON g.id = e.group_id
    ORDER BY s.grado, s.nombre
  `;

  // 2. Fetch active groups from database
  const availableGroups = await sql`
    SELECT id, nombre, jornada, tipo, programa_codigo, programa_nombre, semestre_romano
    FROM groups
    WHERE activo = TRUE
    ORDER BY nombre ASC
  `;

  // 3. Fetch active enrollment student id
  const activeKeys = await sql`
    SELECT value 
    FROM site_content 
    WHERE content_key = 'enrollment_active_student_id' 
    LIMIT 1
  `;
  const activeStudentId = activeKeys.length > 0 ? activeKeys[0].value.trim() : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-gray-700 mb-4">
        <Link href="/admin/attendance" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <ArrowLeft size={14} /> Asistencia
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Gestión de Estudiantes y Tarjetas</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mb-2">GESTIÓN DE ESTUDIANTES Y VINCULACIÓN DE TARJETAS</h1>
          <p className="text-gray-900 font-medium">Modifica grados/cursos/turnos, crea nuevos estudiantes, o vincula tarjetas RFID y NFC.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <CreateGroupButton variant="primary" label="➕ Crear Nuevo Curso" />
          <Link
            href="/admin/attendance/promotion"
            className="px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-purple-700 hover:bg-purple-800 text-white transition-all shadow-sm flex items-center gap-2 shrink-0"
          >
            <span>🎓 Promoción de Semestre</span>
          </Link>
        </div>
      </div>

      <EnrollmentClient 
        students={students.map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          documento: s.documento || null,
          usuario_nro: s.usuario_nro || null,
          grado: s.grado,
          grupo_matriculado: s.grupo_matriculado || null,
          rfid_tag_uid: s.rfid_tag_uid,
          tarjeta_numero: s.tarjeta_numero ? String(s.tarjeta_numero) : null,
          telefono: s.telefono || null,
          email: s.email || null,
          domicilio: s.domicilio || null,
          departamento: s.departamento || null,
          sede: s.sede != null ? Number(s.sede) : 1,
          cumpleanos: s.cumpleanos ? String(s.cumpleanos).split('T')[0] : null,
          inicio_practicas: s.inicio_practicas ? String(s.inicio_practicas).split('T')[0] : null,
          activo: s.activo
        }))} 
        activeStudentId={activeStudentId} 
        pendingUid={pendingUid}
        availableGroups={availableGroups.map((g: any) => ({
          id: g.id,
          nombre: g.nombre,
          jornada: g.jornada,
          tipo: g.tipo,
          programa_codigo: g.programa_codigo,
          programa_nombre: g.programa_nombre,
          semestre_romano: g.semestre_romano
        }))}
      />
    </div>
  );
}
