"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, 
  ArrowLeft, FileText, Calendar, User, BookOpen, Printer, Download, Copy, Check, QrCode
} from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';
import { generateDocumentPDF } from '@/lib/documentPdfGenerator';

interface DocumentRecord {
  id: string;
  consecutivo: string;
  student_nombre: string;
  student_documento: string;
  tipo_documento: string;
  programa_curso: string;
  fecha_expedicion: string;
  folio: string;
  libro: string;
  estado: string;
  notas: string;
  pdf_url: string;
  created_at: string;
}

interface VerifyDetailClientProps {
  doc: DocumentRecord | null;
  searchedCode: string;
}

export default function VerifyDetailClient({ doc, searchedCode }: VerifyDetailClientProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isValido = doc && doc.estado === 'valido';
  const isAnulado = doc && doc.estado === 'anulado';

  const verificationUrl = doc ? `https://fundacionsanmateosoacha.edu.co/verificar/${encodeURIComponent(doc.consecutivo)}` : '';
  const qrImageUrl = doc ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verificationUrl)}` : '';

  const handleCopyLink = () => {
    if (verificationUrl) {
      navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!doc) return;
    try {
      setIsDownloading(true);
      if (doc.pdf_url) {
        const safeName = doc.student_nombre ? `_${doc.student_nombre.trim().replace(/\s+/g, '_')}` : '';
        const link = document.createElement('a');
        link.href = doc.pdf_url;
        link.download = `FSM-000-${doc.consecutivo}${safeName}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        await generateDocumentPDF({
          consecutivo: doc.consecutivo,
          student_nombre: doc.student_nombre,
          student_documento: doc.student_documento,
          tipo_documento: doc.tipo_documento,
          programa_curso: doc.programa_curso,
          fecha_expedicion: doc.fecha_expedicion,
          folio: doc.folio,
          libro: doc.libro,
          estado: doc.estado,
          notas: doc.notas,
        });
      }
    } catch (e) {
      console.error('Error generating/downloading PDF:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Header Bar (Hidden on print) */}
      <header className="bg-white border-b border-gray-200 py-5 px-8 shadow-sm print:hidden">
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
      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 md:py-12 w-full flex flex-col items-center justify-center print:p-0 print:max-w-none">
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
                No se encontró ningún documento activo con el consecutivo o número <strong className="font-mono text-fsm-red">{searchedCode}</strong> en los registros oficiales de la institución.
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

            <div className="pt-4">
              <Link
                href="/verificar"
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Nueva Búsqueda
              </Link>
            </div>
          </div>
        ) : (
          /* Scenario 3: Valid & Authentic Document Certificate */
          <div className="w-full bg-white rounded-[2.5rem] p-6 md:p-10 border-2 border-green-200 shadow-premium space-y-6 relative overflow-hidden print:border-none print:shadow-none print:p-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none print:hidden"></div>

            {/* Verification Watermark Header */}
            <div className="flex flex-col items-center text-center space-y-3 border-b border-gray-100 pb-6">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center border-2 border-green-200 shadow-inner">
                <CheckCircle2 size={40} />
              </div>

              <span className="text-[10px] font-black text-green-800 bg-green-100 border border-green-300 px-4 py-1.5 rounded-full tracking-widest uppercase flex items-center gap-1.5">
                <ShieldCheck size={14} /> DOCUMENTO VÁLIDO Y AUTÉNTICO
              </span>

              <h1 className="text-2xl md:text-3xl font-black text-fsm-blue uppercase tracking-tight leading-tight">
                VERIFICACIÓN OFICIAL DE AUTENTICIDAD
              </h1>

              <p className="text-xs font-semibold text-gray-600 max-w-lg">
                La Fundación San Mateo certifica la validez legal y académica del presente documento registrado bajo el código consecutivo oficial.
              </p>
            </div>

            {/* Official Document Details Card */}
            <div className="bg-gray-50/90 rounded-3xl p-6 md:p-8 border border-gray-200/80 space-y-6">
              
              {/* Header Badge & Consecutivo */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código Consecutivo Institucional</span>
                  <div className="text-xl font-black font-mono text-fsm-blue mt-0.5">{doc.consecutivo}</div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha de Expedición</span>
                  <div className="text-sm font-bold text-gray-800 mt-0.5 flex items-center gap-1.5 sm:justify-end">
                    <Calendar size={14} className="text-fsm-blue" /> {formatDateDDMMYYYY(doc.fecha_expedicion)}
                  </div>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <User size={12} className="text-fsm-blue" /> Estudiante Titular
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

              {/* QR Verification Preview Box */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="p-2 bg-white rounded-xl border border-gray-100 shadow-inner shrink-0">
                  <img src={qrImageUrl} alt={`QR ${doc.consecutivo}`} className="w-20 h-20 object-contain" />
                </div>
                <div className="space-y-1 text-center sm:text-left flex-1">
                  <div className="text-xs font-black text-fsm-blue uppercase flex items-center gap-1 justify-center sm:justify-start">
                    <QrCode size={14} /> Código QR de Validación Directa
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Cualquier persona puede comprobar la legitimidad de este documento escaneando el código QR con la cámara de su celular.
                  </p>
                  <div className="text-[10px] font-mono text-gray-400 break-all">
                    {verificationUrl}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar (Hidden on print) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="px-5 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  <Download size={14} /> {isDownloading ? 'Generando...' : 'Descargar Certificado PDF'}
                </button>

                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1.5"
                >
                  <Printer size={14} /> Imprimir
                </button>

                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1.5"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? 'Enlace Copiado' : 'Copiar Enlace'}
                </button>
              </div>

              <Link
                href="/verificar"
                className="text-xs font-bold text-fsm-blue hover:text-fsm-red transition-colors"
              >
                Nueva Consulta →
              </Link>
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

              <div className="text-[10px] text-gray-400 font-mono">
                Emitido por Sistema Central de Registro y Control Académico
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer (Hidden on print) */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs font-semibold text-gray-500 print:hidden">
        Fundación San Mateo © {new Date().getFullYear()} — Sistema de Verificación Documental
      </footer>
    </div>
  );
}
