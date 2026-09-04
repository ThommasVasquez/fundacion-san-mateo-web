import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Search, FileCheck, ArrowRight, CheckCircle2, XCircle, Calendar, User, BookOpen, AlertCircle } from 'lucide-react';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

interface VerifySearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function VerifySearchPage({ searchParams }: VerifySearchPageProps) {
  const params = await searchParams;
  const searchQuery = (params.q || '').trim();

  let searchResults: any[] = [];
  let searched = false;

  if (searchQuery) {
    searched = true;
    const cleanQuery = searchQuery.toUpperCase();

    // Check if it's an exact consecutivo match first
    const exactMatch = await sql`
      SELECT id, consecutivo, student_nombre, student_documento,
             tipo_documento, programa_curso, fecha_expedicion::text,
             folio, libro, estado, notas, created_at::text
      FROM issued_documents
      WHERE UPPER(consecutivo) = ${cleanQuery}
      LIMIT 1
    `;

    if (exactMatch.length === 1 && exactMatch[0].consecutivo.toUpperCase() === cleanQuery) {
      // Direct redirect if exact consecutivo match
      redirect(`/verificar/${encodeURIComponent(exactMatch[0].consecutivo)}`);
    }

    // Otherwise search by documento, partial consecutivo or name
    searchResults = await sql`
      SELECT id, consecutivo, student_nombre, student_documento,
             tipo_documento, programa_curso, fecha_expedicion::text,
             folio, libro, estado, notas, created_at::text
      FROM issued_documents
      WHERE UPPER(consecutivo) LIKE ${`%${cleanQuery}%`}
         OR UPPER(student_documento) = ${cleanQuery}
         OR UPPER(student_documento) LIKE ${`%${cleanQuery}%`}
         OR UPPER(student_nombre) LIKE ${`%${cleanQuery}%`}
      ORDER BY created_at DESC
      LIMIT 20
    `;
  }

  async function handleSearchAction(formData: FormData) {
    'use server';
    const code = (formData.get('q') as string)?.trim();
    if (code) {
      // If it looks like a clean consecutivo FSM-..., redirect directly
      if (code.toUpperCase().startsWith('FSM-')) {
        redirect(`/verificar/${encodeURIComponent(code.toUpperCase())}`);
      } else {
        redirect(`/verificar?q=${encodeURIComponent(code)}`);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 py-5 px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/FSM.png" alt="Logo Fundación San Mateo" width={44} height={44} className="object-contain" />
            <div>
              <h2 className="text-sm font-black text-fsm-blue uppercase tracking-wider leading-none">Fundación San Mateo</h2>
              <p className="text-[10px] font-black text-fsm-red uppercase tracking-widest leading-none mt-1">Portal Oficial de Verificación</p>
            </div>
          </Link>

          <Link href="/" className="text-xs font-bold text-gray-600 hover:text-fsm-blue transition-colors">
            Volver al Sitio Web →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-premium text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-fsm-blue/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

          {/* Badge & Title */}
          <div className="space-y-3 flex flex-col items-center">
            <div className="w-16 h-16 bg-fsm-blue/5 text-fsm-blue rounded-3xl flex items-center justify-center border border-fsm-blue/10 shadow-inner">
              <ShieldCheck size={36} />
            </div>
            <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest bg-fsm-blue/5 px-3 py-1 rounded-full border border-fsm-blue/10">
              SISTEMA OFICIAL DE AUTENTICIDAD DOCUMENTAL
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-fsm-blue uppercase tracking-tighter">
              VERIFICACIÓN DE DIPLOMAS Y TÍTULOS
            </h1>
            <p className="text-sm font-medium text-gray-600 max-w-xl mx-auto">
              Consulta en tiempo real la validez y autenticidad institucional de diplomas, actas de grado, certificados de estudio y constancias expedidas por la Fundación San Mateo.
            </p>
          </div>

          {/* Search Form */}
          <form action={handleSearchAction} className="max-w-xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-fsm-blue focus-within:ring-2 focus-within:ring-fsm-blue/20 transition-all">
              <div className="flex items-center gap-3 px-4 py-2 flex-1">
                <Search size={20} className="text-gray-400 shrink-0" />
                <input
                  name="q"
                  type="text"
                  required
                  defaultValue={searchQuery}
                  placeholder="Consecutivo (Ej: FSM-2026-00001), Cédula o Nombre..."
                  className="bg-transparent font-bold text-sm text-gray-800 outline-none w-full uppercase placeholder:normal-case placeholder:font-medium placeholder:text-gray-400"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 shrink-0"
              >
                Verificar <ArrowRight size={16} />
              </button>
            </div>
            <p className="text-[11px] font-semibold text-gray-400">
              * Puedes buscar por el código consecutivo impreso en el documento o mediante la cédula del estudiante.
            </p>
          </form>

          {/* Search Results Display */}
          {searched && (
            <div className="pt-6 border-t border-gray-100 text-left space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-fsm-blue tracking-wider">
                  Resultados de la Búsqueda ({searchResults.length})
                </h3>
                <span className="text-[11px] font-bold text-gray-400">Criterio: &quot;{searchQuery}&quot;</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-8 bg-red-50/50 rounded-2xl border border-red-100 text-center space-y-3">
                  <div className="w-12 h-12 bg-red-100 text-fsm-red rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle size={24} />
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    No se encontraron documentos oficiales registrados con ese criterio.
                  </div>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Por favor verifica haber ingresado el código consecutivo exacto (Ej: <span className="font-mono font-bold">FSM-2026-00001</span>) o el número de documento sin puntos ni espacios.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map(doc => {
                    const isValido = doc.estado === 'valido';
                    return (
                      <Link
                        key={doc.id}
                        href={`/verificar/${encodeURIComponent(doc.consecutivo)}`}
                        className="p-5 bg-gray-50/80 hover:bg-blue-50/50 rounded-2xl border border-gray-200/80 hover:border-fsm-blue transition-all space-y-3 group block"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono font-black text-xs text-fsm-blue bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                            {doc.consecutivo}
                          </span>
                          {isValido ? (
                            <span className="text-[9px] font-black text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={10} /> VÁLIDO
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-fsm-red bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <XCircle size={10} /> ANULADO
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-black text-fsm-blue uppercase group-hover:text-fsm-red transition-colors">
                            {doc.student_nombre}
                          </div>
                          {doc.student_documento && (
                            <div className="text-[11px] font-bold text-gray-500">
                              CC/TI: {doc.student_documento}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-gray-200/60 text-xs text-gray-700 space-y-1">
                          <div className="font-bold text-gray-900">{doc.tipo_documento}</div>
                          <div className="text-[11px] text-gray-500 uppercase">{doc.programa_curso}</div>
                          <div className="text-[10px] text-gray-400">
                            Expedición: {formatDateDDMMYYYY(doc.fecha_expedicion)}
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end text-xs font-bold text-fsm-blue group-hover:text-fsm-red gap-1">
                          Ver Certificado Auténtico →
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Verification Banner Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-100 text-left">
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
              <div className="text-fsm-blue font-black text-xs uppercase mb-1">Garantía Digital</div>
              <p className="text-[11px] text-gray-500 font-medium">Validación directa contra el registro oficial de la institución.</p>
            </div>
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
              <div className="text-fsm-blue font-black text-xs uppercase mb-1">Código QR</div>
              <p className="text-[11px] text-gray-500 font-medium">Escaneo instantáneo desde cualquier dispositivo móvil.</p>
            </div>
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
              <div className="text-fsm-blue font-black text-xs uppercase mb-1">Seguridad Anti-fraude</div>
              <p className="text-[11px] text-gray-500 font-medium">Alertas inmediatas si un documento fue alterado o anulado.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs font-semibold text-gray-500">
        Fundación San Mateo © {new Date().getFullYear()} — Todos los derechos reservados.
      </footer>
    </div>
  );
}
