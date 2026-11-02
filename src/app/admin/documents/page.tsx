import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { sql } from '@/lib/db';
import DocumentManagerClient from './DocumentManagerClient';
import { ArrowLeft, ChevronRight, FileCheck, ShieldAlert } from 'lucide-react';
import { getNextDocumentConsecutivo } from '@/app/actions';
import { userHasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminDocumentsPage() {
  const session = (await cookies()).get('session')?.value;
  let parsed: any = null;
  if (session) {
    try {
      parsed = await decrypt(session);
    } catch {
      parsed = null;
    }
  }

  if (!parsed || (!parsed.adminId && !parsed.teacherId)) {
    redirect('/auth/login');
  }

  const userEmail = (parsed.email || '').toLowerCase().trim();
  const hasAccess = userHasPermission('documents_manage', parsed.role, parsed.permissions, userEmail);

  if (!hasAccess) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-red-200 text-center shadow-lg space-y-4">
        <div className="w-16 h-16 bg-red-100 text-fsm-red rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Acceso Restringido</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          No tienes el permiso <strong>Certificados y Código QR</strong> (<code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">documents_manage</code>). La expedición y foliación de certificados oficiales está restringida a Coordinación y Rectoría.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/attendance"
            className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl text-xs font-bold uppercase inline-flex items-center gap-2 hover:bg-fsm-red transition-all shadow-sm"
          >
            <ArrowLeft size={14} /> Volver a Asistencia
          </Link>
        </div>
      </div>
    );
  }

  const isSuperAdmin = userEmail === 'admin@fundacionsanmateo.edu.co' || userEmail === 'admin@fundacionsanmateosoacha.edu.co';

  // Ejecutar consultas en paralelo sin saturar memoria ni tiempo de CPU con base64 pesados
  const [docsRes, nextConsecutivo, studentsRes, progsRes] = await Promise.all([
    sql`
      SELECT 
        id, consecutivo, student_nombre, student_documento,
        tipo_documento, programa_curso, fecha_expedicion::text,
        folio, libro, estado, notas,
        CASE 
          WHEN pdf_url IS NULL OR pdf_url = '' THEN ''
          WHEN pdf_url LIKE '/%' OR pdf_url LIKE 'http%' THEN pdf_url
          ELSE ('/api/documents/issued/' || id::text)
        END as pdf_url,
        created_at::text
      FROM issued_documents
      ORDER BY created_at DESC
      LIMIT 300
    `.catch((err: any) => {
      console.error('Error fetching issued_documents:', err);
      return [];
    }),
    getNextDocumentConsecutivo().catch((err: any) => {
      console.error('Error fetching next consecutivo:', err);
      return 'FSM-2026-00001';
    }),
    sql`
      SELECT DISTINCT nombre, COALESCE(usuario_nro, '') as documento, COALESCE(grado, '') as programa
      FROM students
      WHERE activo = true
      ORDER BY nombre ASC
      LIMIT 500
    `.catch((e: any) => {
      console.error('Error fetching students for autocomplete:', e);
      return [];
    }),
    sql`
      SELECT DISTINCT title 
      FROM programs 
      WHERE active = true 
      ORDER BY title ASC
    `.catch((e: any) => {
      console.error('Error fetching programs:', e);
      return [];
    })
  ]);

  const documents = Array.isArray(docsRes) ? docsRes : [];
  const registeredStudents = (Array.isArray(studentsRes) ? studentsRes : []).map((s: any) => ({
    nombre: s.nombre,
    documento: s.documento,
    programa: s.programa
  }));
  const academicPrograms = (Array.isArray(progsRes) ? progsRes : []).map((p: any) => p.title);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-gray-700">
        <Link href="/admin" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <ArrowLeft size={14} /> Panel
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Documentos Oficiales y QR</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-fsm-blue text-white rounded-2xl flex items-center justify-center shadow-md">
              <FileCheck size={24} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-fsm-blue uppercase tracking-tight">
              Certificados y Documentos Oficiales
            </h1>
          </div>
          <p className="text-gray-900 font-medium mt-2">
            Expide certificados, diplomas y constancias con consecutivo único y código QR de verificación institucional.
          </p>
        </div>
      </div>

      <DocumentManagerClient 
        documents={documents.map((d: any) => ({
          id: d.id,
          consecutivo: d.consecutivo,
          student_nombre: d.student_nombre,
          student_documento: d.student_documento || '',
          tipo_documento: d.tipo_documento,
          programa_curso: d.programa_curso,
          fecha_expedicion: d.fecha_expedicion,
          folio: d.folio || '',
          libro: d.libro || '',
          estado: d.estado,
          notas: d.notas || '',
          pdf_url: d.pdf_url || '',
          created_at: d.created_at
        }))}
        nextConsecutivo={nextConsecutivo}
        registeredStudents={registeredStudents}
        academicPrograms={academicPrograms}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
