import React from 'react';
import { sql } from '@/lib/db';
import VerifyDetailClient from './VerifyDetailClient';

export const dynamic = 'force-dynamic';

interface VerifyConsecutivoPageProps {
  params: Promise<{
    consecutivo: string;
  }>;
}

export default async function VerifyConsecutivoPage({ params }: VerifyConsecutivoPageProps) {
  const { consecutivo } = await params;
  const decodedCode = decodeURIComponent(consecutivo).trim().toUpperCase();

  // Search by consecutivo or student_documento
  const documents = await sql`
    SELECT 
      id, consecutivo, student_nombre, student_documento,
      tipo_documento, programa_curso, fecha_expedicion::text,
      folio, libro, estado, notas, created_at::text
    FROM issued_documents
    WHERE UPPER(consecutivo) = ${decodedCode}
       OR UPPER(student_documento) = ${decodedCode}
    LIMIT 1
  `;

  const doc = documents.length > 0 ? documents[0] : null;

  return (
    <VerifyDetailClient 
      doc={doc ? {
        id: doc.id,
        consecutivo: doc.consecutivo,
        student_nombre: doc.student_nombre,
        student_documento: doc.student_documento || '',
        tipo_documento: doc.tipo_documento,
        programa_curso: doc.programa_curso,
        fecha_expedicion: doc.fecha_expedicion,
        folio: doc.folio || '',
        libro: doc.libro || '',
        estado: doc.estado,
        notas: doc.notas || '',
        created_at: doc.created_at
      } : null}
      searchedCode={decodedCode}
    />
  );
}
