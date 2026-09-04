import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { sql } from '@/lib/db';
import DocumentManagerClient from './DocumentManagerClient';
import { ArrowLeft, ChevronRight, FileCheck } from 'lucide-react';
import { getNextDocumentConsecutivo } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function AdminDocumentsPage() {
  const session = (await cookies()).get('session')?.value;
  let parsed = null;
  if (session) {
    try {
      parsed = await decrypt(session);
    } catch {
      parsed = null;
    }
  }
  const userEmail = (parsed?.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === 'admin@fundacionsanmateo.edu.co' || userEmail === 'admin@fundacionsanmateosoacha.edu.co';
  let documents: any[] = [];
  try {
    const docsRes = await sql`
      SELECT 
        id, consecutivo, student_nombre, student_documento,
        tipo_documento, programa_curso, fecha_expedicion::text,
        folio, libro, estado, notas, pdf_url, created_at::text
      FROM issued_documents
      ORDER BY created_at DESC
    `;
    documents = Array.isArray(docsRes) ? docsRes : [];
  } catch (err) {
    console.error('Error fetching issued_documents:', err);
  }

  let nextConsecutivo = 'FSM-2026-00001';
  try {
    nextConsecutivo = await getNextDocumentConsecutivo();
  } catch (err) {
    console.error('Error fetching next consecutivo:', err);
  }

  // Load registered students for fast autocomplete/selection
  let registeredStudents: { nombre: string; documento: string; programa: string }[] = [];
  try {
    const studentsRes = await sql`
      SELECT DISTINCT nombre, COALESCE(usuario_nro, '') as documento, COALESCE(grado, '') as programa
      FROM students
      WHERE activo = true
      ORDER BY nombre ASC
      LIMIT 1000
    `;
    registeredStudents = studentsRes.map((s: any) => ({
      nombre: s.nombre,
      documento: s.documento,
      programa: s.programa
    }));
  } catch (e) {
    console.error('Error fetching students for autocomplete:', e);
  }

  // Load academic programs
  let academicPrograms: string[] = [];
  try {
    const progsRes = await sql`
      SELECT title FROM academic_programs ORDER BY title ASC
    `;
    academicPrograms = progsRes.map((p: any) => p.title);
  } catch (e) {
    console.error('Error fetching academic programs:', e);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-gray-700 mb-4">
        <Link href="/admin" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <ArrowLeft size={14} /> Panel
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Verificación Documental y Códigos QR</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-fsm-blue/10 text-fsm-blue rounded-xl flex items-center justify-center">
              <FileCheck size={24} />
            </div>
            <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter">
              SISTEMA DE VERIFICACIÓN DOCUMENTAL
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
