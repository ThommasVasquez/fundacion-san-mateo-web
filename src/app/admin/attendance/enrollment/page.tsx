import React from 'react';
import Link from 'next/link';
import { sql } from '@/lib/db';
import EnrollmentClient from './EnrollmentClient';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EnrollmentPageProps {
  searchParams: Promise<{
    pendingUid?: string;
  }>;
}

export default async function EnrollmentPage({ searchParams }: EnrollmentPageProps) {
  const params = await searchParams;
  const pendingUid = params.pendingUid || '';

  // 1. Fetch all students
  const students = await sql`
    SELECT id, nombre, grado, rfid_tag_uid, activo 
    FROM students 
    ORDER BY grado, nombre
  `;

  // 2. Fetch active enrollment student id
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

      <div>
        <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mb-2">GESTIÓN DE ESTUDIANTES Y VINCULACIÓN DE TARJETAS</h1>
        <p className="text-gray-900 font-medium">Modifica grados/cursos/turnos, crea nuevos estudiantes, o vincula tarjetas RFID y NFC.</p>
      </div>

      <EnrollmentClient 
        students={students.map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          grado: s.grado,
          rfid_tag_uid: s.rfid_tag_uid,
          activo: s.activo
        }))} 
        activeStudentId={activeStudentId} 
        pendingUid={pendingUid}
      />
    </div>
  );
}
