'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { 
  Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, 
  Users, RefreshCw, Sparkles, ArrowRight, ShieldCheck, FileCheck
} from 'lucide-react';
import { importStudentsToGroupAction, ImportedStudentItem } from '@/app/actions';

interface GroupExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onSuccess: (count: number) => void;
}

export default function GroupExcelImportModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  onSuccess,
}: GroupExcelImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedStudents, setParsedStudents] = useState<ImportedStudentItem[]>([]);
  const [successResult, setSuccessResult] = useState<{ total: number; created: number; updated: number } | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFileName('');
    setIsReading(false);
    setIsSaving(false);
    setErrorMsg(null);
    setParsedStudents([]);
    setSuccessResult(null);
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    setSuccessResult(null);
    setFileName(file.name);
    setIsReading(true);

    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows: string[][] = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        raw: false, 
        defval: '' 
      });

      if (!rawRows || rawRows.length < 2) {
        throw new Error('El archivo está vacío o no contiene suficientes filas.');
      }

      // 1. Detect header row
      let headerIdx = -1;
      const normalizeHeader = (s: any) => 
        String(s || '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

      for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
        const rowNorm = rawRows[r].map(normalizeHeader);
        if (
          rowNorm.some(c => c.includes('nombre') || c.includes('estudiante') || c.includes('alumno')) ||
          rowNorm.some(c => c.includes('cedula') || c.includes('documento') || c.includes('identificacion'))
        ) {
          headerIdx = r;
          break;
        }
      }

      if (headerIdx === -1) {
        // Fallback: assume row 0 is header
        headerIdx = 0;
      }

      const headers = rawRows[headerIdx].map(normalizeHeader);
      
      // Map columns
      const colMap = {
        nombre: headers.findIndex(h => h.includes('nombre') || h.includes('estudiante') || h.includes('alumno') || h.includes('apellidos')),
        documento: headers.findIndex(h => h.includes('documento') || h.includes('cedula') || h.includes('identificacion') || h.includes('nro doc') || h.includes('no doc') || h.includes('cc') || h.includes('ti') || h.includes('usuario')),
        tarjeta: headers.findIndex(h => h.includes('tarjeta') || h.includes('rfid') || h.includes('chip')),
        telefono: headers.findIndex(h => h.includes('telefono') || h.includes('celular') || h.includes('movil')),
        email: headers.findIndex(h => h.includes('email') || h.includes('correo')),
        domicilio: headers.findIndex(h => h.includes('domicilio') || h.includes('direccion') || h.includes('residencia')),
      };

      if (colMap.nombre === -1 && colMap.documento === -1) {
        throw new Error('No se encontró ninguna columna de "Nombre" ni de "Documento" en el encabezado del archivo.');
      }

      // If nombre is not explicitly named, but column 1 or 2 has text
      const nameCol = colMap.nombre !== -1 ? colMap.nombre : 0;
      const docCol = colMap.documento;

      const extracted: ImportedStudentItem[] = [];
      const seenNames = new Set<string>();

      for (let r = headerIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || !row.some(c => String(c).trim())) continue;

        const rawName = String(row[nameCol] || '').trim();
        // Check if rawName looks like a header repetition
        if (normalizeHeader(rawName).includes('nombre') || normalizeHeader(rawName).includes('estudiante')) continue;

        const rawDoc = docCol !== -1 ? String(row[docCol] || '').trim() : '';
        const rawTarjeta = colMap.tarjeta !== -1 ? String(row[colMap.tarjeta] || '').trim() : '';
        const rawTel = colMap.telefono !== -1 ? String(row[colMap.telefono] || '').trim() : '';
        const rawEmail = colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '';
        const rawDom = colMap.domicilio !== -1 ? String(row[colMap.domicilio] || '').trim() : '';

        // Clean name
        const cleanName = rawName.toUpperCase();
        if (!cleanName || cleanName.length < 3) continue;

        // Clean document (numbers or letters)
        const cleanDoc = rawDoc.replace(/[^a-zA-Z0-9]/g, '') || null;

        // Avoid exact duplicate rows within same file
        const uniqueKey = cleanDoc || cleanName;
        if (seenNames.has(uniqueKey)) continue;
        seenNames.add(uniqueKey);

        extracted.push({
          nombre: cleanName,
          documento: cleanDoc,
          usuarioNro: cleanDoc,
          tarjetaNumero: rawTarjeta ? rawTarjeta.replace(/[^0-9]/g, '') : null,
          telefono: rawTel || null,
          email: rawEmail || null,
          domicilio: rawDom || null,
        });
      }

      if (extracted.length === 0) {
        throw new Error('No se encontraron filas con nombres de estudiantes válidos en el archivo.');
      }

      setParsedStudents(extracted);
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      setErrorMsg(err.message || 'Error al procesar el archivo Excel');
      setParsedStudents([]);
    } finally {
      setIsReading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const wsData = [
        ['Nombre', 'Documento', 'Tarjeta', 'Teléfono', 'Email', 'Dirección'],
        ['GÓMEZ PÉREZ MARÍA CAMILA', '1023456789', '1051', '3101234567', 'maria.gomez@gmail.com', 'Calle 13 # 4-50 Soacha'],
        ['RODRÍGUEZ SILVA JUAN DAVID', '1098765432', '1052', '3209876543', 'juan.rodriguez@gmail.com', 'Carrera 7 # 18-20'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
      XLSX.writeFile(wb, `Plantilla_Matricula_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    } catch (e) {
      console.error('Error al generar plantilla:', e);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedStudents.length === 0) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await importStudentsToGroupAction(groupId, parsedStudents);
      if (res.success) {
        setSuccessResult({
          total: res.total || parsedStudents.length,
          created: res.createdCount || 0,
          updated: res.updatedCount || 0,
        });
        onSuccess(res.total || parsedStudents.length);
      } else {
        setErrorMsg(res.error || 'Ocurrió un error al importar los estudiantes');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error de conexión al importar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-6 bg-gradient-to-r from-fsm-blue to-purple-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shrink-0 p-1.5">
              <Image 
                src="/FSM.png" 
                alt="Escudo Fundación San Mateo" 
                width={36} 
                height={36} 
                className="w-9 h-9 object-contain drop-shadow" 
              />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70 block">
                IMPORTACIÓN DIRECTA A CURSO
              </span>
              <h2 className="text-lg font-black uppercase tracking-tight text-white leading-tight">
                MATRICULAR EN {groupName}
              </h2>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => { resetState(); onClose(); }}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-gray-800">
          {/* Mensaje de Error */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-fsm-red font-bold text-xs uppercase flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Estado: Éxito */}
          {successResult ? (
            <div className="p-8 text-center space-y-4 bg-emerald-50 border border-emerald-200 rounded-3xl animate-in fade-in duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  MATRÍCULA EXITOSA
                </span>
                <h3 className="text-xl font-black text-emerald-950 uppercase mt-2">
                  ¡{successResult.total} Estudiantes Matriculados!
                </h3>
                <p className="text-xs font-semibold text-emerald-800 mt-1">
                  Los estudiantes ya figuran formalmente en la planilla de asistencia y matriz oficial de <strong>{groupName}</strong>.
                </p>
                <div className="flex justify-center gap-4 text-xs font-bold text-emerald-900 mt-3">
                  <span>✨ {successResult.created} nuevos creados</span>
                  <span>•</span>
                  <span>🔄 {successResult.updated} actualizados</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { resetState(); onClose(); }}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm mt-2"
              >
                Cerrar y Ver Planilla Actualizada
              </button>
            </div>
          ) : (
            <>
              {/* Dropzone de Fichero */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileChange(e.dataTransfer.files?.[0]);
                }}
                className="border-2 border-dashed border-purple-200 hover:border-purple-600 rounded-3xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-purple-50/40 transition-all group"
              >
                <div className="w-14 h-14 bg-purple-100 text-purple-700 group-hover:scale-110 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-transform shadow-sm">
                  {isReading ? (
                    <RefreshCw size={26} className="animate-spin text-purple-700" />
                  ) : (
                    <Upload size={26} />
                  )}
                </div>
                <h4 className="text-sm font-black uppercase text-fsm-blue tracking-tight">
                  {fileName ? `Archivo: ${fileName}` : 'Selecciona o Arrastra el Archivo Excel / CSV'}
                </h4>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Formatos compatibles: .xlsx, .xls o .csv.
                </p>
                <p className="text-[11px] text-purple-700 font-bold mt-2">
                  💡 Detecta automáticamente columnas: Nombre, Cédula/Documento, N° Tarjeta, Teléfono, etc.
                </p>

                <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadTemplate();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                    title="Descargar una hoja de cálculo modelo con las columnas sugeridas"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-600" />
                    <span>Descargar Plantilla de Ejemplo (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Vista Previa de Estudiantes Detectados */}
              {parsedStudents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-purple-700" />
                      <span className="text-xs font-black uppercase text-purple-900">
                        {parsedStudents.length} Estudiante(s) Listos para Matricular
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded-md">
                      Destino: {groupName}
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-gray-200/80 shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-gray-600 font-black uppercase tracking-wider text-[10px] sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Nombre Completo</th>
                          <th className="py-2.5 px-3">Cédula / Doc</th>
                          <th className="py-2.5 px-3">Tarjeta</th>
                          <th className="py-2.5 px-3">Teléfono</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white font-medium">
                        {parsedStudents.slice(0, 50).map((st, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 text-[10px] font-bold text-gray-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-fsm-blue uppercase">{st.nombre}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-gray-600">
                              {st.documento || <span className="text-gray-300 italic">Sin doc</span>}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-purple-700">
                              {st.tarjetaNumero || '-'}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-gray-500">
                              {st.telefono || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedStudents.length > 50 && (
                    <p className="text-[10px] text-gray-400 text-right italic font-medium">
                      Mostrando los primeros 50 de {parsedStudents.length} estudiantes detectados.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer con Botones */}
        {!successResult && (
          <div className="p-5 bg-slate-50 border-t border-gray-100 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => { resetState(); onClose(); }}
              className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isSaving || isReading || parsedStudents.length === 0}
              className="px-6 py-2.5 bg-fsm-blue hover:bg-fsm-red text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Matriculando en {groupName}...</span>
                </>
              ) : (
                <>
                  <FileCheck size={14} />
                  <span>Matricular {parsedStudents.length} Estudiantes</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
