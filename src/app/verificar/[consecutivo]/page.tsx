import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { 
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, 
  ArrowLeft, FileText, Calendar, User, BookOpen, Award, Hash, Printer, Download
} from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';

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
      folio, libro, estado, notas, pdf_url, created_at::text
    FROM issued_documents
    WHERE UPPER(consecutivo) = ${decodedCode}
       OR UPPER(student_documento) = ${decodedCode}
    LIMIT 1
  `;

  const doc = documents.length > 0 ? documents[0] : null;
  const isValido = doc && doc.estado === 'valido';
  const isAnulado = doc && doc.estado === 'anulado';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 py-5 px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/verificar" className="flex items-center gap-3">
            <Image src="/FSM.png" alt="Logo Fundación San Mateo" width={44} height={44} className="object-contain" />
            <div>
              <h2 className="text-sm font-black text-fsm-blue uppercase tracking-wider leading-none">Fundación San Mateo</h2>
              <p className="text-[10px] font-black text-fsm-red uppercase tracking-widest leading-none mt-1">Portal Oficial de Verificación</p>
            </div>
          </Link>

          <Link href="/verificar" className="text-xs font-bold text-fsm-blue hover:text-fsm-red transition-colors flex items-center gap-1">
            <ArrowLeft size={14} /> Nueva Consulta
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full flex flex-col items-center justify-center">
        {!doc ? (
          /* Scenario 1: Document Not Found */
          <div className="w-full bg-white rounded-[2.5rem] p-8 md:p-12 border border-red-100 shadow-premium text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-fsm-red rounded-full flex items-center justify-center mx-auto border border-red-100">
              <XCircle size={48} />
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-black text-fsm-red uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-200">
                VERIFICACIÓN FALLIDA
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-fsm-blue uppercase tracking-tight">
                DOCUMENTO NO REGISTRADO
              </h1>
              <p className="text-sm font-semibold text-gray-600 max-w-md mx-auto">
                No se encontró ningún documento activo con el consecutivo <strong className="font-mono text-fsm-red">{decodedCode}</strong> en los registros oficiales de la institución.
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-left text-xs font-semibold text-gray-600 space-y-1 max-w-md mx-auto">
              <div className="font-bold text-gray-800 uppercase mb-1 flex items-center gap-1">
                <AlertTriangle size={14} className="text-amber-500" /> Revisa los siguientes puntos:
              </div>
              <p>• Verifica haber escrito exactamente el código consecutivo (ejemplo: <span className="font-mono">FSM-2026-00001</span>).</p>
              <p>• Asegúrate de que el documento haya sido expedido directamente por la Fundación San Mateo.</p>
            </div>

            <div className="pt-4">
              <Link
                href="/verificar"
                className="px-8 py-3 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md inline-flex items-center gap-2"
              >
                Volver a Buscar
              </Link>
            </div>
          </div>
        ) : isAnulado ? (
          /* Scenario 2: Document Annulled / Revoked */
          <div className="w-full bg-white rounded-[2.5rem] p-8 md:p-12 border-2 border-red-200 shadow-premium text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full blur-xl -mr-12 -mt-12"></div>

            <div className="w-20 h-20 bg-red-100 text-fsm-red rounded-full flex items-center justify-center mx-auto border-2 border-red-200 animate-pulse">
              <AlertTriangle size={48} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-white bg-fsm-red px-3.5 py-1.5 rounded-full tracking-widest uppercase">
                ALERTA - DOCUMENTO ANULADO
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-fsm-red uppercase tracking-tight">
                ESTE DOCUMENTO FUE ANULADO OFICIALMENTE
              </h1>
              <p className="text-sm font-semibold text-gray-700 max-w-lg mx-auto">
                El documento consecutivo <strong className="font-mono text-fsm-red">{doc.consecutivo}</strong> expedido a nombre de <strong>{doc.student_nombre}</strong> ha sido <span className="text-fsm-red font-black uppercase">ANULADO y sin validez legal</span> por la dirección académica de la Fundación San Mateo.
              </p>
            </div>

            <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-left space-y-3 text-xs font-semibold text-gray-700 max-w-lg mx-auto">
              <div className="flex justify-between border-b border-red-200 pb-2">
                <span className="text-gray-500 uppercase">Consecutivo:</span>
                <span className="font-mono font-bold text-fsm-red">{doc.consecutivo}</span>
              </div>
              <div className="flex justify-between border-b border-red-200 pb-2">
                <span className="text-gray-500 uppercase">Estudiante:</span>
                <span className="font-bold text-gray-900">{doc.student_nombre}</span>
              </div>
              <div className="flex justify-between border-b border-red-200 pb-2">
                <span className="text-gray-500 uppercase">Tipo de Documento:</span>
                <span className="font-bold text-gray-900">{doc.tipo_documento}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 uppercase">Programa / Curso:</span>
                <span className="font-bold text-gray-900">{doc.programa_curso}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Scenario 3: Valid & Authentic Document Certificate */
          <div className="w-full bg-white rounded-[2.5rem] p-8 md:p-12 border-2 border-green-200 shadow-premium space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            {/* Status Header */}
            <div className="flex flex-col items-center text-center space-y-3 border-b border-gray-100 pb-8">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center border-2 border-green-200 shadow-inner">
                <CheckCircle2 size={52} />
              </div>

              <span className="text-[10px] font-black text-green-800 bg-green-100 border border-green-300 px-4 py-1.5 rounded-full tracking-widest uppercase flex items-center gap-1.5">
                <ShieldCheck size={14} /> DOCUMENTO VÁLIDO Y AUTÉNTICO
              </span>

              <h1 className="text-2xl md:text-3xl font-black text-fsm-blue uppercase tracking-tight leading-tight">
                DOCUMENTO VERIFICADO OFICIALMENTE
              </h1>

              <p className="text-xs font-semibold text-gray-600 max-w-lg">
                La Fundación San Mateo certifica la autenticidad y validez del presente documento registrado bajo el código consecutivo oficial.
              </p>
            </div>

            {/* Official Document Details Card */}
            <div className="bg-gray-50/80 rounded-3xl p-6 md:p-8 border border-gray-200/80 space-y-6">
              
              {/* Header Badge & Consecutivo */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código Consecutivo Institucional</span>
                  <div className="text-xl font-black font-mono text-fsm-blue mt-0.5">{doc.consecutivo}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha de Expedición</span>
                  <div className="text-sm font-bold text-gray-800 mt-0.5 flex items-center gap-1.5 justify-end">
                    <Calendar size={14} className="text-fsm-blue" /> {formatDateDDMMYYYY(doc.fecha_expedicion)}
                  </div>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <User size={12} className="text-fsm-blue" /> Estudiante
                  </div>
                  <div className="text-base font-black text-fsm-blue uppercase">{doc.student_nombre}</div>
                  {doc.student_documento && (
                    <div className="text-xs font-bold text-gray-500">Documento Identidad: {doc.student_documento}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <FileText size={12} className="text-fsm-blue" /> Tipo de Documento
                  </div>
                  <div className="text-base font-black text-gray-900">{doc.tipo_documento}</div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <BookOpen size={12} className="text-fsm-blue" /> Programa / Curso Acreditado
                  </div>
                  <div className="text-base font-black text-fsm-blue uppercase">{doc.programa_curso}</div>
                </div>

                {(doc.folio || doc.libro) && (
                  <div className="space-y-1 md:col-span-2 pt-2 border-t border-gray-200/60 flex gap-6 text-xs font-bold text-gray-600">
                    {doc.folio && <div>Folio Registro: <span className="font-mono text-gray-900">{doc.folio}</span></div>}
                    {doc.libro && <div>Libro Registro: <span className="font-mono text-gray-900">{doc.libro}</span></div>}
                  </div>
                )}
              </div>
            </div>

            {/* Official Stamp Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 text-xs font-semibold text-gray-500">
              <div className="flex items-center gap-3">
                <Image src="/FSM.png" alt="Sello FSM" width={36} height={36} className="object-contain" />
                <div>
                  <div className="font-black text-fsm-blue uppercase text-[11px]">Fundación San Mateo</div>
                  <div className="text-[10px] text-gray-400">Verificación Digital Emitida Automáticamente</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href="/verificar"
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Nueva Búsqueda
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs font-semibold text-gray-500">
        Fundación San Mateo © {new Date().getFullYear()} — Sistema de Verificación Documental
      </footer>
    </div>
  );
}
