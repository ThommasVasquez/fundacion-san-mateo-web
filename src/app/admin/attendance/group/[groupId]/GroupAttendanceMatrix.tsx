'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { 
  Calendar, Users, Download, Plus, CheckCircle2, XCircle, 
  Sparkles, Layers, Filter, Clock, Check, AlertCircle, RefreshCw,
  FileSpreadsheet, ShieldCheck, Lock, FileText, Search, ChevronLeft, ChevronRight,
  Target, EyeOff, AlertTriangle
} from 'lucide-react';
import { 
  updateCellAttendanceAction, 
  bulkUpdateGroupSessionStateAction, 
  bulkUpdateDateRangeGroupStateAction 
} from '@/app/actions';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';
import { isColombiaHoliday } from '@/lib/colombiaHolidays';
import { exportGroupMatrixToExcel } from '@/lib/excelExportHelper';

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
  canModifyAll: boolean;
  currentUserEmail?: string;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

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
  canModifyAll,
  currentUserEmail = '',
}: GroupAttendanceMatrixProps) {
  const [records, setRecords] = useState<Record<string, { estado: string; observaciones?: string }>>(() => {
    const map: Record<string, { estado: string; observaciones?: string }> = {};
    initialRecords.forEach(r => {
      map[`${r.student_id}_${r.session_id}`] = { estado: r.estado, observaciones: r.observaciones };
    });
    return map;
  });

  const [isPending, startTransition] = useTransition();
  const [selectedCell, setSelectedCell] = useState<{ 
    studentId: string; 
    sessionId: string; 
    currentEstado: string; 
    studentName: string; 
    fechaStr: string;
    observaciones?: string;
  } | null>(null);

  const [excuseObs, setExcuseObs] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  
  // Spotlight / Row Focus mode state
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);
  
  // Available months extraction
  const availableMonths = useMemo(() => {
    const map = new Map<string, { key: string; label: string; year: string; count: number }>();
    sessions.forEach(s => {
      if (s.fecha && s.fecha.length >= 7) {
        const key = s.fecha.slice(0, 7); // '2026-08'
        const [year, month] = key.split('-');
        const monthName = MONTH_NAMES[month] || month;
        const current = map.get(key) || { key, label: `${monthName} ${year}`, year, count: 0 };
        current.count++;
        map.set(key, current);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [sessions]);

  // Month selector state: default to 'ALL' (or you can pick a specific month)
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Filtered sessions based on selected month
  const displayedSessions = useMemo(() => {
    if (selectedMonth === 'ALL') return sessions;
    return sessions.filter(s => s.fecha.startsWith(selectedMonth));
  }, [sessions, selectedMonth]);

  // Filtered students by search term
  const displayedStudents = useMemo(() => {
    if (!searchStudent.trim()) return students;
    const q = searchStudent.toLowerCase().trim();
    return students.filter(st => 
      st.nombre_original.toLowerCase().includes(q) || 
      (st.documento && st.documento.includes(q))
    );
  }, [students, searchStudent]);

  // Group summary metrics
  const groupMetrics = useMemo(() => {
    let totalStudentsWithAbsences = 0;
    let totalStudentsAtRisk = 0;
    let totalGroupAbsents = 0;
    let totalGroupLectivos = 0;

    students.forEach(st => {
      let stAbsents = 0;
      let stLectivos = 0;
      sessions.forEach(s => {
        const record = records[`${st.id}_${s.id}`];
        const holidayInfo = isColombiaHoliday(s.fecha);
        const estado = record?.estado || (holidayInfo.isHoliday ? 'FESTIVO' : 'PRESENTE');
        if (estado === 'AUSENTE') {
          stAbsents++;
          stLectivos++;
        } else if (estado === 'PRESENTE' || estado === 'EXCUSA_MEDICA') {
          stLectivos++;
        }
      });
      if (stAbsents > 0) totalStudentsWithAbsences++;
      if (stAbsents >= 3) totalStudentsAtRisk++;
      totalGroupAbsents += stAbsents;
      totalGroupLectivos += stLectivos;
    });

    const avgAttendance = totalGroupLectivos > 0 
      ? Math.round(((totalGroupLectivos - totalGroupAbsents) / totalGroupLectivos) * 100) 
      : 100;

    return {
      totalStudentsWithAbsences,
      totalStudentsAtRisk,
      avgAttendance
    };
  }, [students, sessions, records]);
  
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
    setTimeout(() => setNotification(null), 4500);
  };

  // Cell click handler
  const handleCellClick = async (studentId: string, sessionId: string, studentName: string, fechaStr: string) => {
    const current = records[`${studentId}_${sessionId}`]?.estado || 'PRESENTE';
    const currentObs = records[`${studentId}_${sessionId}`]?.observaciones || '';

    if (!canModifyAll) {
      // Non-admins open the Excusa Médica modal
      setExcuseObs(currentObs);
      setSelectedCell({
        studentId,
        sessionId,
        currentEstado: current,
        studentName,
        fechaStr,
        observaciones: currentObs,
      });
      return;
    }

    // Admin cycle: PRESENTE -> AUSENTE -> EXCUSA_MEDICA -> PRESENTE
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
  const handleSelectState = async (newState: string, customObs: string = '') => {
    if (!selectedCell) return;
    const { studentId, sessionId } = selectedCell;

    setRecords(prev => ({
      ...prev,
      [`${studentId}_${sessionId}`]: { estado: newState, observaciones: customObs }
    }));
    setSelectedCell(null);

    startTransition(async () => {
      const res = await updateCellAttendanceAction(studentId, sessionId, newState, customObs);
      if (res.success) {
        showToast('✓ Registro actualizado correctamente');
      } else {
        showToast(res.error || 'Error al actualizar', 'error');
      }
    });
  };

  // Apply bulk update (Admin only)
  const handleApplyBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifyAll) {
      showToast('Permiso denegado: Acción reservada para admin@fundacionsanmateo.edu.co', 'error');
      return;
    }

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

  // Export Matrix to Excel (XLSX) in official institutional layout with Logo and Colors
  const handleExportXLSX = async () => {
    try {
      const monthTitle = selectedMonth === 'ALL' 
        ? 'Semestre Completo' 
        : (availableMonths.find(m => m.key === selectedMonth)?.label || selectedMonth);

      await exportGroupMatrixToExcel({
        groupName,
        jornada,
        tipo,
        periodoTitle: monthTitle,
        sessions: displayedSessions,
        students,
        records
      });
      showToast('✓ Archivo Excel institucional generado con éxito');
    } catch (err: any) {
      console.error('Error exporting Excel:', err);
      showToast('Error al exportar archivo Excel', 'error');
    }
  };

  const focusedStudent = useMemo(() => {
    if (!focusedStudentId) return null;
    return students.find(s => s.id === focusedStudentId) || null;
  }, [students, focusedStudentId]);

  return (
    <div className="space-y-6">
      {/* Role & Permissions Banner */}
      <div className={`p-4 rounded-3xl border text-xs flex items-center justify-between gap-3 ${
        canModifyAll 
          ? 'bg-amber-50/80 border-amber-200 text-amber-950'
          : 'bg-blue-50/80 border-blue-200 text-blue-950'
      }`}>
        <div className="flex items-center gap-2.5 font-bold">
          {canModifyAll ? (
            <ShieldCheck size={20} className="text-amber-700 shrink-0" />
          ) : (
            <Lock size={20} className="text-blue-700 shrink-0" />
          )}
          <div>
            <p className="font-black text-xs uppercase tracking-wide">
              {canModifyAll 
                ? 'Perfil Administrador General Activo' 
                : 'Perfil Funcionario / Docente (Solo Excusas Médicas)'}
            </p>
            <p className="text-[11px] opacity-80 font-normal">
              {canModifyAll 
                ? 'Tienes autorización total para modificar asistencias, inasistencias y ejecutar marcado masivo en este grupo.'
                : 'La modificación directa de asistencias está reservada para admin@fundacionsanmateo.edu.co. Tú puedes cargar y justificar excusas médicas.'}
            </p>
          </div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-3 py-1.5 rounded-xl border border-gray-200/60 shrink-0">
          {currentUserEmail || 'Usuario Actual'}
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-fsm-blue uppercase tracking-tight flex items-center gap-2">
            <Layers size={22} className="text-fsm-blue" />
            Planilla de Asistencia Cotejada
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Cotejada con los registros físicos en tiempo real de torniquetes y paneles de acceso.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bulk Update Button (Admin Only) */}
          {canModifyAll ? (
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
            >
              <Sparkles size={16} />
              Marcado Masivo (Festivo / Prácticas)
            </button>
          ) : (
            <div 
              title="El marcado masivo está reservado para admin@fundacionsanmateo.edu.co"
              className="px-4 py-2.5 bg-gray-100 text-gray-400 border border-gray-200 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-not-allowed select-none"
            >
              <Lock size={14} />
              Marcado Masivo (Restringido)
            </div>
          )}

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

      {/* Month Selector Tabs & Student Search Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-fsm-blue" />
              Seleccionar Período / Mes a Visualizar
            </div>
            
            {/* Month Buttons Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl border border-gray-200/80">
              <button
                type="button"
                onClick={() => setSelectedMonth('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedMonth === 'ALL'
                    ? 'bg-fsm-blue text-white shadow-sm font-black'
                    : 'text-gray-600 hover:text-gray-950 hover:bg-white/80'
                }`}
              >
                🌐 Todo el Semestre ({sessions.length} clases)
              </button>

              {availableMonths.map(m => {
                const isSelected = selectedMonth === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMonth(m.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-fsm-blue text-white shadow-sm font-black'
                        : 'text-gray-700 hover:text-gray-950 hover:bg-white/80'
                    }`}
                  >
                    <span>📅 {m.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/60 text-gray-600'
                    }`}>
                      {m.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Search Student */}
          <div className="w-full md:w-72">
            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5 flex items-center gap-1.5">
              <Search size={13} className="text-fsm-blue" />
              Filtrar Estudiante en Planilla
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre o documento..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              {searchStudent && (
                <button
                  type="button"
                  onClick={() => setSearchStudent('')}
                  className="absolute right-3 top-2.5 text-[10px] font-black text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Focus / Spotlight Notification Banner */}
      {focusedStudent && (
        <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fade-in shadow-sm">
          <div className="flex items-center gap-2 text-amber-950 font-bold">
            <Target size={18} className="text-amber-700 animate-pulse" />
            <span>
              🎯 Modo Enfoque Activo: Siguiendo la fila de <strong>{focusedStudent.nombre_original}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFocusedStudentId(null)}
            className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-[11px] uppercase transition-all flex items-center gap-1 shadow-2xs"
          >
            <EyeOff size={12} /> Desactivar Enfoque
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all animate-fade-in ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {notification.msg}
        </div>
      )}

      {/* Group Attendance & Absenteeism Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">
            Matriculados
          </span>
          <span className="text-xl font-black text-fsm-blue mt-0.5 block">
            {students.length}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">
            Asistencia Grupal
          </span>
          <span className={`text-xl font-black mt-0.5 block ${
            groupMetrics.avgAttendance >= 80 ? 'text-emerald-700' : 'text-amber-700'
          }`}>
            {groupMetrics.avgAttendance}%
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">
            Con Inasistencias
          </span>
          <span className="text-xl font-black text-amber-800 mt-0.5 block">
            {groupMetrics.totalStudentsWithAbsences}
          </span>
        </div>

        <div className={`p-3.5 rounded-2xl border shadow-2xs ${
          groupMetrics.totalStudentsAtRisk > 0 
            ? 'bg-red-50/80 border-red-200 text-red-900' 
            : 'bg-white border-gray-100 text-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider block">
              En Riesgo (≥3 Fallas)
            </span>
            {groupMetrics.totalStudentsAtRisk > 0 && (
              <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-black animate-pulse">
                ALERTA
              </span>
            )}
          </div>
          <span className="text-xl font-black text-red-700 mt-0.5 block">
            {groupMetrics.totalStudentsAtRisk}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-200/60">
        <span className="uppercase text-gray-400 font-black mr-2">Convenciones:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className={`px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border} flex items-center gap-1.5`}>
            <span className="font-black">{cfg.short}</span>: {cfg.label}
          </span>
        ))}
        <span className="ml-auto text-gray-400 font-normal italic">
          💡 Tip: Haz clic sobre el nombre de un alumno para enfocar y resaltar toda su fila horizontal.
        </span>
      </div>

      {/* Interactive Matrix Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs font-black text-fsm-blue uppercase">
          <div className="flex items-center gap-2">
            <span>
              {selectedMonth === 'ALL' 
                ? `📅 Mostrando Semestre Completo (${displayedSessions.length} fechas)` 
                : `📅 Mostrando Mes: ${availableMonths.find(m => m.key === selectedMonth)?.label || selectedMonth} (${displayedSessions.length} fechas)`}
            </span>
          </div>
          <span className="text-gray-400 font-normal">
            Estudiantes: {displayedStudents.length} / {students.length}
          </span>
        </div>

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
                {displayedSessions.map(s => {
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
              {displayedStudents.map((st, sIdx) => {
                let totalAbsents = 0;
                let totalLectivos = 0;
                const isFocused = focusedStudentId === st.id;
                const isAnotherFocused = focusedStudentId !== null && !isFocused;

                return (
                  <tr 
                    key={st.id} 
                    className={`transition-all duration-200 ${
                      isFocused 
                        ? 'bg-amber-100/90 ring-2 ring-amber-400 ring-inset shadow-md font-bold'
                        : isAnotherFocused 
                          ? 'opacity-25 blur-[0.5px] hover:opacity-100 hover:blur-none hover:bg-blue-50/40' 
                          : 'hover:bg-blue-50/40'
                    }`}
                  >
                    {/* Row Index */}
                    <td 
                      className={`p-3 text-center font-bold sticky left-0 z-10 border-r ${
                        isFocused
                          ? 'bg-amber-200 text-amber-950 border-amber-300'
                          : 'bg-white text-gray-400 border-gray-100'
                      }`}
                    >
                      {isFocused ? (
                        <Target size={14} className="mx-auto text-amber-800 animate-pulse" />
                      ) : (
                        sIdx + 1
                      )}
                    </td>

                    {/* Student Name (Clickable for Spotlight) */}
                    <td 
                      onClick={() => setFocusedStudentId(prev => prev === st.id ? null : st.id)}
                      className={`p-3 sticky left-12 z-10 border-r whitespace-nowrap shadow-sm cursor-pointer select-none transition-colors ${
                        isFocused 
                          ? 'bg-amber-200 text-amber-950 border-amber-300 font-black' 
                          : 'bg-white text-gray-900 border-gray-100 font-bold hover:text-fsm-blue hover:bg-blue-50/60'
                      }`}
                      title={isFocused ? "Clic para quitar el enfoque" : "Clic para enfocar y resaltar toda la fila de este alumno"}
                    >
                      <div className="flex items-center justify-between gap-2 max-w-[220px]">
                        <div className="truncate" title={st.nombre_original}>
                          {st.nombre_original}
                        </div>
                        {isFocused && (
                          <span className="text-[9px] bg-amber-300 text-amber-950 px-1.5 py-0.5 rounded font-black shrink-0">
                            ENFOCADO
                          </span>
                        )}
                      </div>
                      {st.documento && (
                        <div className={`text-[10px] font-normal ${isFocused ? 'text-amber-800' : 'text-gray-400'}`}>
                          CC: {st.documento}
                        </div>
                      )}
                    </td>

                    {/* Session Cells */}
                    {displayedSessions.map(s => {
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
                          className={`p-1 text-center border-r select-none cursor-pointer ${
                            isFocused ? 'border-amber-200/80 bg-amber-50/40' : 'border-gray-100'
                          }`}
                          onClick={() => handleCellClick(st.id, s.id, st.nombre_original, s.fecha)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setExcuseObs(record?.observaciones || '');
                            setSelectedCell({
                              studentId: st.id,
                              sessionId: s.id,
                              currentEstado: estado,
                              studentName: st.nombre_original,
                              fechaStr: s.fecha,
                              observaciones: record?.observaciones,
                            });
                          }}
                          title={`${st.nombre_original} - ${formatDateDDMMYYYY(s.fecha)}: ${cfg.label} ${record?.observaciones ? `(${record.observaciones})` : ''} ${!canModifyAll ? '• Clic para agregar excusa médica' : '• Clic para alternar'}`}
                        >
                          <div className={`w-full py-2 rounded-lg border font-black text-xs transition-all ${cfg.bg} ${cfg.text} ${cfg.border} shadow-2xs hover:scale-110 active:scale-95 ${
                            isFocused ? 'ring-1 ring-amber-300' : ''
                          }`}>
                            {cfg.short}
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Absences */}
                    <td className={`p-3 text-center font-black border-l ${
                      isFocused 
                        ? 'bg-amber-100/90 border-amber-300 text-red-800 text-sm' 
                        : totalAbsents >= 3 
                          ? 'bg-red-100/80 border-red-200 text-red-700' 
                          : totalAbsents > 0
                            ? 'bg-amber-50/60 border-gray-100 text-amber-800'
                            : 'bg-emerald-50/30 border-gray-100 text-emerald-700'
                    }`}>
                      <div className="flex items-center justify-center gap-1">
                        {totalAbsents >= 3 && <AlertTriangle size={13} className="text-red-600 animate-pulse shrink-0" />}
                        <span className="text-xs font-black">{totalAbsents}</span>
                      </div>
                      {totalAbsents >= 3 && (
                        <span className="block text-[8px] font-extrabold uppercase tracking-tighter text-red-600 mt-0.5">
                          Riesgo
                        </span>
                      )}
                    </td>

                    {/* Attendance Percentage */}
                    <td className={`p-3 text-center font-black ${
                      isFocused 
                        ? 'bg-amber-100/90 text-emerald-900 text-sm' 
                        : totalLectivos > 0 && Math.round(((totalLectivos - totalAbsents) / totalLectivos) * 100) < 80
                          ? 'bg-red-50 text-red-700 font-black'
                          : 'bg-emerald-50/40 text-emerald-700'
                    }`}>
                      {totalLectivos > 0 ? `${Math.round(((totalLectivos - totalAbsents) / totalLectivos) * 100)}%` : '100%'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Detail / Selector Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 animate-scale-up">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-fsm-blue uppercase">
                {canModifyAll ? 'Modificar Asistencia' : 'Registrar Excusa Médica'}
              </h3>
              <p className="text-xs text-gray-800 font-bold mt-0.5">{selectedCell.studentName}</p>
              <p className="text-[11px] text-gray-400">Fecha: {formatDateDDMMYYYY(selectedCell.fechaStr)}</p>
            </div>

            {canModifyAll ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectState(key, excuseObs)}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${cfg.bg} ${cfg.text} ${cfg.border} flex items-center justify-between hover:ring-2 hover:ring-fsm-blue`}
                    >
                      <span>{cfg.label}</span>
                      <span className="font-black text-xs">{cfg.short}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Observaciones / Justificación</label>
                  <input
                    type="text"
                    placeholder="Ej. Incapacidad médica, calamidad..."
                    value={excuseObs}
                    onChange={(e) => setExcuseObs(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs font-medium">
                  Estás registrando una <strong>Excusa Médica</strong> para este día.
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Detalle de la Excusa / Incapacidad *</label>
                  <textarea
                    rows={3}
                    placeholder="Número de incapacidad EPS, motivo médico o justificación formal..."
                    value={excuseObs}
                    onChange={(e) => setExcuseObs(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectState('EXCUSA_MEDICA', excuseObs)}
                    disabled={isPending}
                    className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-teal-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FileText size={14} /> Guardar Excusa Médica
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase hover:bg-gray-200 transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Bulk Update Modal (Admin Only) */}
      {showBulkModal && canModifyAll && (
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
