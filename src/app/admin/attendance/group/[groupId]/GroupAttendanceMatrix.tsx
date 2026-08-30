'use client';

import React, { useState, useTransition } from 'react';
import { 
  Calendar, Users, Download, Plus, CheckCircle2, XCircle, 
  Sparkles, Layers, Filter, Clock, Check, AlertCircle, RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  updateCellAttendanceAction, 
  bulkUpdateGroupSessionStateAction, 
  bulkUpdateDateRangeGroupStateAction 
} from '@/app/actions';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';
import { isColombiaHoliday } from '@/lib/colombiaHolidays';

export interface StudentData {
  id: string;
  nombre_original: string;
  documento?: string;
  estado?: string;
}

export interface SessionData {
  id: string;
  fecha: string; // YYYY-MM-DD
  dia_semana_texto: string;
}

export interface MatrixRecord {
  student_id: string;
  session_id: string;
  fecha: string;
  estado: string;
  observaciones?: string;
}

interface GroupAttendanceMatrixProps {
  groupId: string;
  groupName: string;
  jornada: string;
  tipo: string;
  students: StudentData[];
  sessions: SessionData[];
  records: MatrixRecord[];
}

const STATUS_CONFIG: Record<string, { label: string; short: string; bg: string; text: string; border: string }> = {
  PRESENTE: { label: 'Presente', short: 'P', bg: 'bg-emerald-50 hover:bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  AUSENTE: { label: 'Ausente (Falla)', short: 'X', bg: 'bg-red-50 hover:bg-red-100', text: 'text-red-700 font-black', border: 'border-red-200' },
  FESTIVO: { label: 'Festivo Nacional', short: 'F', bg: 'bg-indigo-50 hover:bg-indigo-100', text: 'text-indigo-700 font-bold', border: 'border-indigo-200' },
  LIBRE: { label: 'Día Libre / No Lectivo', short: 'L', bg: 'bg-gray-100 hover:bg-gray-200', text: 'text-gray-600', border: 'border-gray-300' },
  COMITE_ACADEMICO: { label: 'Comité Académico', short: 'C', bg: 'bg-amber-50 hover:bg-amber-100', text: 'text-amber-700 font-bold', border: 'border-amber-200' },
  PRACTICAS: { label: 'Prácticas Clínicas', short: 'PR', bg: 'bg-sky-50 hover:bg-sky-100', text: 'text-sky-700 font-bold', border: 'border-sky-200' },
  EXCUSA_MEDICA: { label: 'Excusa Médica', short: 'E', bg: 'bg-teal-50 hover:bg-teal-100', text: 'text-teal-700 font-bold', border: 'border-teal-200' },
  CALENDARIO_B: { label: 'Calendario B', short: 'CB', bg: 'bg-purple-50 hover:bg-purple-100', text: 'text-purple-700 font-bold', border: 'border-purple-200' },
};

export default function GroupAttendanceMatrix({
  groupId,
  groupName,
  jornada,
  tipo,
  students,
  sessions,
  records: initialRecords,
}: GroupAttendanceMatrixProps) {
  const [records, setRecords] = useState<Record<string, { estado: string; observaciones?: string }>>(() => {
    const map: Record<string, { estado: string; observaciones?: string }> = {};
    initialRecords.forEach(r => {
      map[`${r.student_id}_${r.session_id}`] = { estado: r.estado, observaciones: r.observaciones };
    });
    return map;
  });

  const [isPending, startTransition] = useTransition();
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; sessionId: string; currentEstado: string; studentName: string; fechaStr: string } | null>(null);
  
  // Bulk modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState<'single' | 'range'>('single');
  const [bulkDate, setBulkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bulkStartDate, setBulkStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bulkEndDate, setBulkEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bulkState, setBulkState] = useState('FESTIVO');
  const [bulkObs, setBulkObs] = useState('');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Quick cycle state on click
  const handleCellClick = async (studentId: string, sessionId: string, studentName: string, fechaStr: string) => {
    const current = records[`${studentId}_${sessionId}`]?.estado || 'PRESENTE';
    
    // Cycle: PRESENTE -> AUSENTE -> EXCUSA_MEDICA -> PRESENTE
    let nextState = 'AUSENTE';
    if (current === 'AUSENTE') nextState = 'EXCUSA_MEDICA';
    else if (current === 'EXCUSA_MEDICA') nextState = 'PRESENTE';
    else if (current === 'PRESENTE') nextState = 'AUSENTE';
    else nextState = 'PRESENTE';

    // Optimistic update
    setRecords(prev => ({
      ...prev,
      [`${studentId}_${sessionId}`]: { estado: nextState }
    }));

    startTransition(async () => {
      const res = await updateCellAttendanceAction(studentId, sessionId, nextState);
      if (!res.success) {
        showToast(res.error || 'Error al guardar estado', 'error');
      }
    });
  };

  // Handle direct state selection from cell popover
  const handleSelectState = async (newState: string) => {
    if (!selectedCell) return;
    const { studentId, sessionId } = selectedCell;

    setRecords(prev => ({
      ...prev,
      [`${studentId}_${sessionId}`]: { estado: newState }
    }));
    setSelectedCell(null);

    startTransition(async () => {
      const res = await updateCellAttendanceAction(studentId, sessionId, newState);
      if (res.success) {
        showToast('✓ Registro actualizado');
      } else {
        showToast(res.error || 'Error al actualizar', 'error');
      }
    });
  };

  // Apply bulk update
  const handleApplyBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowBulkModal(false);

    startTransition(async () => {
      if (bulkMode === 'single') {
        const res = await bulkUpdateGroupSessionStateAction(groupId, bulkDate, bulkState, bulkObs);
        if (res.success) {
          showToast(`✓ Aplicado ${bulkState} a ${res.count} estudiantes en ${formatDateDDMMYYYY(bulkDate)}`);
          window.location.reload();
        } else {
          showToast(res.error || 'Error al aplicar cambio masivo', 'error');
        }
      } else {
        const res = await bulkUpdateDateRangeGroupStateAction(groupId, bulkStartDate, bulkEndDate, bulkState, bulkObs);
        if (res.success) {
          showToast(`✓ Aplicado ${bulkState} en ${res.daysCount} días del rango.`);
          window.location.reload();
        } else {
          showToast(res.error || 'Error al aplicar rango', 'error');
        }
      }
    });
  };

  // Export Matrix to Excel (XLSX) in official institutional layout
  const handleExportXLSX = () => {
    // 1. Headers: Dates
    const headerRow1 = ['#', 'DOCUMENTO', 'ESTUDIANTE / ALUMNO'];
    sessions.forEach(s => {
      headerRow1.push(formatDateDDMMYYYY(s.fecha));
    });
    headerRow1.push('TOTAL FALLAS', '% ASISTENCIA');

    // 2. Data rows
    const dataRows = students.map((st, idx) => {
      let totalAbsents = 0;
      let totalLectivos = 0;

      const row: (string | number)[] = [idx + 1, st.documento || 'S/D', st.nombre_original];

      sessions.forEach(s => {
        const state = records[`${st.id}_${s.id}`]?.estado || 'PRESENTE';
        const isHoliday = isColombiaHoliday(s.fecha).isHoliday;
        
        let cellVal = 'P';
        if (state === 'AUSENTE') {
          cellVal = 'X';
          totalAbsents++;
          totalLectivos++;
        } else if (state === 'PRESENTE') {
          cellVal = 'P';
          totalLectivos++;
        } else if (state === 'FESTIVO' || isHoliday) {
          cellVal = 'FESTIVO';
        } else if (state === 'LIBRE') {
          cellVal = 'LIBRE';
        } else if (state === 'COMITE_ACADEMICO') {
          cellVal = 'COMITE';
        } else if (state === 'PRACTICAS') {
          cellVal = 'PRACTICAS';
        } else if (state === 'EXCUSA_MEDICA') {
          cellVal = 'EXCUSA';
          totalLectivos++;
        } else if (state === 'CALENDARIO_B') {
          cellVal = 'CAL_B';
        }
        row.push(cellVal);
      });

      const pct = totalLectivos > 0 ? Math.round(((totalLectivos - totalAbsents) / totalLectivos) * 100) : 100;
      row.push(totalAbsents, `${pct}%`);
      return row;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([
      [`CONTROL DE ASISTENCIA ACADÉMICA - GRUPO: ${groupName}`],
      [`Jornada: ${jornada} | Tipo: ${tipo} | Estudiantes: ${students.length}`],
      [],
      headerRow1,
      ...dataRows
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Matriz_Asistencia');
    XLSX.writeFile(workbook, `Matriz_Asistencia_${groupName.replace(/\s+/g, '_')}.xlsx`);
    showToast('✓ Archivo Excel generado y descargado');
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight flex items-center gap-2">
            <Layers size={22} className="text-fsm-blue" />
            Planilla de Asistencia Semestral
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Haz clic en cualquier celda para alternar el estado (Presente ➔ Ausente ➔ Excusa) o utiliza el marcado masivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bulk Update Button */}
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <Sparkles size={16} />
            Marcado Masivo (Festivo / Prácticas)
          </button>

          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExportXLSX}
            className="px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet size={16} />
            Exportar Matriz Excel
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all animate-fade-in ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {notification.msg}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-200/60">
        <span className="uppercase text-gray-400 font-black mr-2">Convenciones:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className={`px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border} flex items-center gap-1.5`}>
            <span className="font-black">{cfg.short}</span>: {cfg.label}
          </span>
        ))}
      </div>

      {/* Interactive Matrix Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="sticky top-0 z-20 bg-gray-900 text-white">
              <tr>
                <th className="p-3.5 text-[11px] font-black uppercase tracking-wider text-center w-12 sticky left-0 z-30 bg-gray-900 border-r border-gray-800">
                  #
                </th>
                <th className="p-3.5 text-[11px] font-black uppercase tracking-wider sticky left-12 z-30 bg-gray-900 border-r border-gray-800 min-w-[220px]">
                  Estudiante
                </th>
                {sessions.map(s => {
                  const holidayInfo = isColombiaHoliday(s.fecha);
                  return (
                    <th 
                      key={s.id} 
                      className={`p-2 text-center border-r border-gray-800 min-w-[70px] ${
                        holidayInfo.isHoliday ? 'bg-indigo-950 text-indigo-200' : ''
                      }`}
                      title={holidayInfo.isHoliday ? `Festivo: ${holidayInfo.holidayName}` : s.dia_semana_texto}
                    >
                      <div className="text-[10px] font-black leading-tight">{formatDateDDMMYYYY(s.fecha).slice(0, 5)}</div>
                      <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[65px]">
                        {s.dia_semana_texto.slice(0, 3)}
                      </div>
                    </th>
                  );
                })}
                <th className="p-3.5 text-[10px] font-black uppercase text-center bg-red-950/80 text-red-200 border-l border-gray-800 min-w-[80px]">
                  Fallas
                </th>
                <th className="p-3.5 text-[10px] font-black uppercase text-center bg-emerald-950/80 text-emerald-200 min-w-[80px]">
                  % Asist.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {students.map((st, sIdx) => {
                let totalAbsents = 0;
                let totalLectivos = 0;

                return (
                  <tr key={st.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Row Index */}
                    <td className="p-3 text-center font-bold text-gray-400 sticky left-0 z-10 bg-white border-r border-gray-100">
                      {sIdx + 1}
                    </td>

                    {/* Student Name */}
                    <td className="p-3 font-bold text-gray-900 sticky left-12 z-10 bg-white border-r border-gray-100 whitespace-nowrap shadow-sm">
                      <div className="truncate max-w-[220px]" title={st.nombre_original}>
                        {st.nombre_original}
                      </div>
                      {st.documento && (
                        <div className="text-[10px] text-gray-400 font-normal">CC: {st.documento}</div>
                      )}
                    </td>

                    {/* Session Cells */}
                    {sessions.map(s => {
                      const record = records[`${st.id}_${s.id}`];
                      const holidayInfo = isColombiaHoliday(s.fecha);
                      const estado = record?.estado || (holidayInfo.isHoliday ? 'FESTIVO' : 'PRESENTE');
                      const cfg = STATUS_CONFIG[estado] || STATUS_CONFIG.PRESENTE;

                      if (estado === 'AUSENTE') {
                        totalAbsents++;
                        totalLectivos++;
                      } else if (estado === 'PRESENTE' || estado === 'EXCUSA_MEDICA') {
                        totalLectivos++;
                      }

                      return (
                        <td 
                          key={s.id} 
                          className="p-1 text-center border-r border-gray-100 select-none cursor-pointer"
                          onClick={() => handleCellClick(st.id, s.id, st.nombre_original, s.fecha)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedCell({
                              studentId: st.id,
                              sessionId: s.id,
                              currentEstado: estado,
                              studentName: st.nombre_original,
                              fechaStr: s.fecha
                            });
                          }}
                          title={`${st.nombre_original} - ${formatDateDDMMYYYY(s.fecha)}: ${cfg.label} (Clic para alternar, Clic derecho para selector)`}
                        >
                          <div className={`w-full py-2 rounded-lg border font-black text-xs transition-all ${cfg.bg} ${cfg.text} ${cfg.border} shadow-2xs hover:scale-105 active:scale-95`}>
                            {cfg.short}
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Absences */}
                    <td className="p-3 text-center font-black text-red-600 bg-red-50/40 border-l border-gray-100">
                      {totalAbsents}
                    </td>

                    {/* Attendance Percentage */}
                    <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/40">
                      {totalLectivos > 0 ? `${Math.round(((totalLectivos - totalAbsents) / totalLectivos) * 100)}%` : '100%'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Detail / Direct Selector Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 animate-scale-up">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-fsm-blue uppercase">Cambiar Estado de Asistencia</h3>
              <p className="text-xs text-gray-500 font-bold mt-0.5">{selectedCell.studentName}</p>
              <p className="text-[11px] text-gray-400">Fecha: {formatDateDDMMYYYY(selectedCell.fechaStr)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectState(key)}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${cfg.bg} ${cfg.text} ${cfg.border} flex items-center justify-between hover:ring-2 hover:ring-fsm-blue`}
                >
                  <span>{cfg.label}</span>
                  <span className="font-black text-xs">{cfg.short}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleApplyBulk} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 animate-scale-up">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-fsm-blue uppercase flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" />
                Marcado Masivo de Grupo
              </h3>
              <p className="text-xs text-gray-500">
                Aplica un estado simultáneamente a los {students.length} estudiantes de <strong>{groupName}</strong>.
              </p>
            </div>

            {/* Mode selection: Single date vs Date range */}
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setBulkMode('single')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bulkMode === 'single' ? 'bg-white text-fsm-blue shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Fecha Única
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('range')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bulkMode === 'range' ? 'bg-white text-fsm-blue shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Rango de Fechas
              </button>
            </div>

            {/* Date Inputs */}
            {bulkMode === 'single' ? (
              <div>
                <label className="text-[11px] font-black uppercase text-gray-500 block mb-1">Fecha</label>
                <input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-gray-500 block mb-1">Desde</label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-gray-500 block mb-1">Hasta</label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
                  />
                </div>
              </div>
            )}

            {/* State Selection */}
            <div>
              <label className="text-[11px] font-black uppercase text-gray-500 block mb-1">Estado a Aplicar</label>
              <select
                value={bulkState}
                onChange={(e) => setBulkState(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
              >
                <option value="FESTIVO">FESTIVO — Día Festivo Nacional</option>
                <option value="PRACTICAS">PRACTICAS — Prácticas Clínicas / Formativas</option>
                <option value="COMITE_ACADEMICO">COMITE_ACADEMICO — Jornada Pedagógica / Comité</option>
                <option value="LIBRE">LIBRE — Día Libre / No Lectivo</option>
                <option value="PRESENTE">PRESENTE — Asistencia Completa del Grupo</option>
                <option value="AUSENTE">AUSENTE — Inasistencia Colectiva del Grupo</option>
              </select>
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-[11px] font-black uppercase text-gray-500 block mb-1">Observaciones (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Feriado puente Ley Emiliani, Prácticas Hospital..."
                value={bulkObs}
                onChange={(e) => setBulkObs(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase hover:bg-fsm-red transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? <RefreshCw size={14} className="animate-spin" /> : 'Aplicar a Todo el Salón'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
