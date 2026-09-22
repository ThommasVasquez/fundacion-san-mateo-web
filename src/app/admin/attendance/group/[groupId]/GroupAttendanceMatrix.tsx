'use client';

import React, { useState, useTransition, useMemo, useDeferredValue, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, Users, Download, Plus, CheckCircle2, XCircle, 
  Sparkles, Layers, Filter, Clock, Check, AlertCircle, RefreshCw,
  FileSpreadsheet, ShieldCheck, Lock, FileText, Search, ChevronLeft, ChevronRight,
  Target, EyeOff, AlertTriangle, Upload, Edit3, Settings, Table, User, SlidersHorizontal, Stethoscope
} from 'lucide-react';
import { 
  updateCellAttendanceAction, 
  bulkUpdateGroupSessionStateAction, 
  bulkUpdateDateRangeGroupStateAction,
  syncGroupSessionsAction,
  updateGroupTotalClassesAction,
  updateGroupRiskThresholdAction
} from '@/app/actions';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';
import { isColombiaHoliday } from '@/lib/colombiaHolidays';
import GroupExcelImportModal from './GroupExcelImportModal';

export interface ExcuseItem {
  studentId: string;
  studentName: string;
  studentDoc: string;
  sessionId: string;
  fecha: string;
  diaSemana: string;
  estado: string;
  observaciones: string;
}

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
  initialTotalClasses?: number | null;
  defaultProgramTotalClasses?: number | null;
  programName?: string;
  canEditTotalClasses?: boolean;
  initialRiskThreshold?: number | null;
  canEditRiskThreshold?: boolean;
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
  EXCUSA_PRACTICAS_AIPI: { label: 'Excusa Prácticas AIPI', short: 'PA', bg: 'bg-fuchsia-50 hover:bg-fuchsia-100', text: 'text-fuchsia-700 font-bold', border: 'border-fuchsia-200' },
  CALENDARIO_B: { label: 'Calendario B', short: 'CB', bg: 'bg-purple-50 hover:bg-purple-100', text: 'text-purple-700 font-bold', border: 'border-purple-200' },
  PENDIENTE: { label: 'Programada (Pendiente)', short: '-', bg: 'bg-gray-50/70 hover:bg-gray-100', text: 'text-gray-400 font-bold', border: 'border-gray-200' },
  NO_HUBO_CLASE: { label: 'No Hubo Clase', short: 'NHC', bg: 'bg-orange-50 hover:bg-orange-100', text: 'text-orange-700 font-bold', border: 'border-orange-200' },
  TERMINACION_DE_SEMESTRE: { label: 'Fin de Semestre', short: 'FIN', bg: 'bg-slate-100 hover:bg-slate-200', text: 'text-slate-600 font-bold', border: 'border-slate-300' },
  CONGELADO: { label: 'Congelado', short: 'CG', bg: 'bg-cyan-50 hover:bg-cyan-100', text: 'text-cyan-700 font-bold', border: 'border-cyan-200' },
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
  initialTotalClasses = null,
  defaultProgramTotalClasses = null,
  programName = '',
  canEditTotalClasses = false,
  initialRiskThreshold = null,
  canEditRiskThreshold = false,
}: GroupAttendanceMatrixProps) {
  const router = useRouter();
  const [showImportModal, setShowImportModal] = useState(false);
  const [groupTotalClasses, setGroupTotalClasses] = useState<number | null>(initialTotalClasses ?? null);
  const [showTotalClassesModal, setShowTotalClassesModal] = useState(false);
  const [inputTotalClasses, setInputTotalClasses] = useState<string>(
    initialTotalClasses ? String(initialTotalClasses) : defaultProgramTotalClasses ? String(defaultProgramTotalClasses) : ''
  );
  const [isSavingTotalClasses, setIsSavingTotalClasses] = useState(false);

  // ─── Umbral de Fallas para Riesgo State ─────────────────────────────────────
  const [groupRiskThreshold, setGroupRiskThreshold] = useState<number | null>(initialRiskThreshold ?? null);
  const [showRiskThresholdModal, setShowRiskThresholdModal] = useState(false);
  const [inputRiskThreshold, setInputRiskThreshold] = useState<string>(
    initialRiskThreshold ? String(initialRiskThreshold) : '3'
  );
  const [isSavingRiskThreshold, setIsSavingRiskThreshold] = useState(false);

  // Effective risk threshold (defaults to 3)
  const effectiveRiskThreshold = useMemo(() => {
    if (groupRiskThreshold !== null && groupRiskThreshold > 0) {
      return groupRiskThreshold;
    }
    return 3;
  }, [groupRiskThreshold]);

  // ─── Excuses Filter Panel State ───────────────────────────────────────────
  const [showExcusesPanel, setShowExcusesPanel] = useState(false);
  const [excuseFilterStudent, setExcuseFilterStudent] = useState('ALL');
  const [excuseFilterMode, setExcuseFilterMode] = useState<'semester' | 'month' | 'range'>('semester');
  const [excuseFilterMonth, setExcuseFilterMonth] = useState('ALL');
  const [excuseFilterFrom, setExcuseFilterFrom] = useState('');
  const [excuseFilterTo, setExcuseFilterTo] = useState('');
  const [isExportingExcuses, setIsExportingExcuses] = useState(false);

  // Effective total classes: Group override > Program default > Sessions length
  const effectiveTotalClasses = useMemo(() => {
    if (groupTotalClasses !== null && groupTotalClasses > 0) {
      return groupTotalClasses;
    }
    if (defaultProgramTotalClasses !== null && defaultProgramTotalClasses > 0) {
      return defaultProgramTotalClasses;
    }
    return sessions.length > 0 ? sessions.length : 1;
  }, [groupTotalClasses, defaultProgramTotalClasses, sessions.length]);

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
  const [selectedExcuseType, setSelectedExcuseType] = useState<'EXCUSA_MEDICA' | 'EXCUSA_PRACTICAS_AIPI'>('EXCUSA_MEDICA');
  const [searchStudent, setSearchStudent] = useState('');
  const deferredSearchStudent = useDeferredValue(searchStudent);
  
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

  // Filtered students by search term (supports multi-word in any order)
  const displayedStudents = useMemo(() => {
    if (!deferredSearchStudent.trim()) return students;
    const terms = deferredSearchStudent.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return students.filter(st => {
      const full = `${st.nombre_original} ${st.documento || ''}`.toLowerCase();
      return terms.every(t => full.includes(t));
    });
  }, [students, deferredSearchStudent]);

  const todayStr = useMemo(() => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date()), []);

  // Count of sessions held/evaluated to date (excluding holidays and pre-CB)
  const taughtSessionsCount = useMemo(() => {
    return sessions.filter(s => {
      const isCB = (groupName || '').toUpperCase().includes('CB') || (tipo || '').toUpperCase().includes('CALENDARIO_B');
      const isPreCB = isCB && s.fecha < '2026-09-01';
      const holidayInfo = isColombiaHoliday(s.fecha);
      if (isPreCB || holidayInfo.isHoliday) return false;
      return s.fecha <= todayStr;
    }).length;
  }, [sessions, groupName, tipo, todayStr]);

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
        const isCB = (groupName || '').toUpperCase().includes('CB') || (tipo || '').toUpperCase().includes('CALENDARIO_B');
        const isPreCB = isCB && s.fecha < '2026-09-01';
        const holidayInfo = isColombiaHoliday(s.fecha);

        let estado = record ? record.estado : (s.fecha >= todayStr ? 'PENDIENTE' : 'AUSENTE');
        if (s.fecha === todayStr && (!record || record.estado === 'PENDIENTE')) {
          estado = 'PENDIENTE';
        } else if (isPreCB) {
          estado = record?.estado && record.estado !== 'AUSENTE' ? record.estado : 'CALENDARIO_B';
        } else if (holidayInfo.isHoliday) {
          estado = record?.estado && record.estado !== 'AUSENTE' ? record.estado : 'FESTIVO';
        } else if (s.fecha > todayStr && (!record || record.estado === 'PENDIENTE')) {
          estado = 'PENDIENTE';
        }

        if (estado === 'AUSENTE') {
          stAbsents++;
          stLectivos++;
        } else if (estado === 'PRESENTE' || estado === 'EXCUSA_MEDICA' || estado === 'EXCUSA_PRACTICAS_AIPI' || estado === 'PRACTICAS') {
          stLectivos++;
        }
      });
      if (stAbsents > 0) totalStudentsWithAbsences++;
      if (stAbsents >= effectiveRiskThreshold) {
        totalStudentsAtRisk++;
      }
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
  }, [students, sessions, records, groupName, tipo, todayStr, effectiveRiskThreshold]);

  // Handler to update group total classes
  const handleSaveTotalClasses = async (val: number | null) => {
    setIsSavingTotalClasses(true);
    try {
      const res = await updateGroupTotalClassesAction(groupId, val);
      if (res.success) {
        setGroupTotalClasses(res.totalClases ?? null);
        showToast(`✓ Total de clases del grupo actualizado: ${res.totalClases ? `${res.totalClases} clases` : 'Modo automático'}`);
        setShowTotalClassesModal(false);
        router.refresh();
      } else {
        showToast(res.error || 'Error al actualizar clases totales', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error inesperado', 'error');
    } finally {
      setIsSavingTotalClasses(false);
    }
  };

  // Handler to update group risk threshold
  const handleSaveRiskThreshold = async (val: number | null) => {
    setIsSavingRiskThreshold(true);
    try {
      const res = await updateGroupRiskThresholdAction(groupId, val);
      if (res.success) {
        setGroupRiskThreshold(res.fallasRiesgo ?? null);
        showToast(val ? `✓ Umbral de riesgo fijado en ${val} fallas` : '✓ Umbral restablecido a 3 fallas por defecto');
        setShowRiskThresholdModal(false);
        router.refresh();
      } else {
        showToast(res.error || 'Error al actualizar umbral de riesgo', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error inesperado', 'error');
    } finally {
      setIsSavingRiskThreshold(false);
    }
  };
  
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
    const isCB = (groupName || '').toUpperCase().includes('CB') || (tipo || '').toUpperCase().includes('CALENDARIO_B');
    const isPreCB = isCB && fechaStr < '2026-09-01';
    const holidayInfo = isColombiaHoliday(fechaStr);
    const defaultState = isPreCB ? 'CALENDARIO_B' : holidayInfo.isHoliday ? 'FESTIVO' : fechaStr > todayStr ? 'PENDIENTE' : 'AUSENTE';

    const currentRecord = records[`${studentId}_${sessionId}`];
    let current = currentRecord?.estado || defaultState;
    if (isPreCB && current === 'AUSENTE') current = 'CALENDARIO_B';
    if (holidayInfo.isHoliday && current === 'AUSENTE') current = 'FESTIVO';

    const currentObs = currentRecord?.observaciones || '';

    if (!canModifyAll) {
      // Non-admins open the Excusa modal (Médica o Prácticas AIPI)
      setExcuseObs(currentObs);
      setSelectedExcuseType(current === 'EXCUSA_PRACTICAS_AIPI' || groupName.toUpperCase().includes('AIPI') ? 'EXCUSA_PRACTICAS_AIPI' : 'EXCUSA_MEDICA');
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

    // Admin cycle: PRESENTE -> AUSENTE -> EXCUSA_MEDICA -> (EXCUSA_PRACTICAS_AIPI si aplica) -> PRESENTE
    let nextState = 'AUSENTE';
    if (current === 'AUSENTE') nextState = 'PRESENTE';
    else if (current === 'PRESENTE') nextState = 'EXCUSA_MEDICA';
    else if (current === 'EXCUSA_MEDICA') {
      nextState = groupName.toUpperCase().includes('AIPI') ? 'EXCUSA_PRACTICAS_AIPI' : 'AUSENTE';
    }
    else if (current === 'EXCUSA_PRACTICAS_AIPI') nextState = 'AUSENTE';
    else if (current === 'PENDIENTE') nextState = 'PRESENTE';
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

  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Sync / Generate missing calendar sessions (e.g. September to December)
  const handleSyncCalendar = async () => {
    if (!canModifyAll) return;
    if (!window.confirm(`¿Deseas generar y sincronizar las fechas de clase oficiales faltantes (Septiembre a Diciembre) para este grupo?`)) {
      return;
    }
    setIsSyncingCalendar(true);
    try {
      const res = await syncGroupSessionsAction(groupId);
      if (res.success) {
        showToast(`✓ Se generaron ${res.addedCount} sesiones de clase exitosamente.`);
        window.location.reload();
      } else {
        showToast(res.error || 'Error al generar sesiones', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error de conexión', 'error');
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // ─── Computed filtered excuses list ──────────────────────────────────────
  const allExcuseItems = useMemo(() => {
    const items: ExcuseItem[] = [];
    sessions.forEach(s => {
      students.forEach(st => {
        const record = records[`${st.id}_${s.id}`];
        if (!record) return;
        const isExcuse = record.estado === 'EXCUSA_MEDICA' || record.estado === 'EXCUSA_PRACTICAS_AIPI';
        if (!isExcuse) return;
        items.push({
          studentId: st.id,
          studentName: st.nombre_original,
          studentDoc: st.documento || '',
          sessionId: s.id,
          fecha: s.fecha,
          diaSemana: s.dia_semana_texto,
          estado: record.estado,
          observaciones: record.observaciones || '',
        });
      });
    });
    // Sort by date ascending
    return items.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [students, sessions, records]);

  const filteredExcuseItems = useMemo(() => {
    let items = allExcuseItems;
    // Filter by student
    if (excuseFilterStudent !== 'ALL') {
      items = items.filter(i => i.studentId === excuseFilterStudent);
    }
    // Filter by date range / month / semester
    if (excuseFilterMode === 'month' && excuseFilterMonth !== 'ALL') {
      items = items.filter(i => i.fecha.startsWith(excuseFilterMonth));
    } else if (excuseFilterMode === 'range') {
      if (excuseFilterFrom) items = items.filter(i => i.fecha >= excuseFilterFrom);
      if (excuseFilterTo) items = items.filter(i => i.fecha <= excuseFilterTo);
    }
    return items;
  }, [allExcuseItems, excuseFilterStudent, excuseFilterMode, excuseFilterMonth, excuseFilterFrom, excuseFilterTo]);

  const handleExportExcuses = useCallback(async () => {
    if (filteredExcuseItems.length === 0) {
      showToast('No hay excusas en el período/alumno seleccionado', 'error');
      return;
    }
    setIsExportingExcuses(true);
    try {
      const { exportExcusesReportToExcel } = await import('@/lib/excelExportHelper');
      const periodLabel = excuseFilterMode === 'month' && excuseFilterMonth !== 'ALL'
        ? (availableMonths.find(m => m.key === excuseFilterMonth)?.label || excuseFilterMonth)
        : excuseFilterMode === 'range'
          ? `${excuseFilterFrom || '...'} al ${excuseFilterTo || '...'}`
          : 'Semestre Completo';
      const studentLabel = excuseFilterStudent !== 'ALL'
        ? (students.find(s => s.id === excuseFilterStudent)?.nombre_original || '')
        : undefined;
      await exportExcusesReportToExcel({
        groupName,
        jornada,
        tipo,
        periodTitle: periodLabel,
        studentFilterTitle: studentLabel,
        excuses: filteredExcuseItems.map((item, i) => ({
          consecutivo: i + 1,
          nombre: item.studentName,
          documento: item.studentDoc,
          fecha: item.fecha.split('-').reverse().join('/'),
          diaSemana: item.diaSemana,
          tipo: item.estado === 'EXCUSA_PRACTICAS_AIPI' ? 'Excusa Prácticas AIPI' : 'Excusa Médica',
          observaciones: item.observaciones,
        })),
      });
      showToast('✓ Reporte de Excusas exportado correctamente');
    } catch (err: any) {
      console.error('Error exporting excuses:', err);
      showToast('Error al exportar excusas', 'error');
    } finally {
      setIsExportingExcuses(false);
    }
  }, [filteredExcuseItems, excuseFilterMode, excuseFilterMonth, excuseFilterFrom, excuseFilterTo,
      excuseFilterStudent, students, groupName, jornada, tipo, availableMonths]);

  // Export Matrix to Excel (XLSX) in official institutional layout with Logo and Colors
  const handleExportXLSX = async () => {
    try {
      const monthTitle = selectedMonth === 'ALL' 
        ? 'Semestre Completo' 
        : (availableMonths.find(m => m.key === selectedMonth)?.label || selectedMonth);

      const { exportGroupMatrixToExcel } = await import('@/lib/excelExportHelper');
      await exportGroupMatrixToExcel({
        groupName,
        jornada,
        tipo,
        periodoTitle: monthTitle,
        sessions: displayedSessions,
        students,
        records,
        totalClases: effectiveTotalClasses
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
            Planilla Oficial de Asistencia
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Control oficial celda por celda — Información fidedigna de planillas docentes y registros institucionales.
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

          {/* Export Excuses Report */}
          <button
            type="button"
            onClick={() => setShowExcusesPanel(prev => !prev)}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm border ${
              showExcusesPanel
                ? 'bg-teal-600 text-white border-teal-700'
                : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-600 hover:text-white hover:border-teal-700'
            }`}
          >
            <Stethoscope size={16} />
            {showExcusesPanel ? 'Ocultar Panel Excusas' : 'Excusas Médicas'}
            {allExcuseItems.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                showExcusesPanel ? 'bg-white/20 text-white' : 'bg-teal-200 text-teal-900'
              }`}>
                {allExcuseItems.length}
              </span>
            )}
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

          {/* Import from Excel */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-fsm-blue text-white hover:bg-fsm-red rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            title="Cargar listado de estudiantes en Excel para matricularlos en este curso"
          >
            <Upload size={16} />
            Importar Estudiantes Excel
          </button>
        </div>
      </div>

      {/* ── Excusas Médicas Filter Panel ─────────────────────────────────────── */}
      {showExcusesPanel && (
        <div className="bg-white rounded-3xl border border-teal-200 shadow-sm overflow-hidden animate-fade-in">
          {/* Panel Header */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 rounded-xl">
                <Stethoscope size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  Reporte de Excusas Médicas
                </h3>
                <p className="text-[11px] text-teal-200 font-medium">
                  Filtra y exporta las excusas médicas del grupo: {groupName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-white/20 text-white rounded-xl text-xs font-black">
                {filteredExcuseItems.length} excusa{filteredExcuseItems.length !== 1 ? 's' : ''} encontrada{filteredExcuseItems.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={handleExportExcuses}
                disabled={isExportingExcuses || filteredExcuseItems.length === 0}
                className="px-4 py-2 bg-white text-teal-800 hover:bg-teal-50 rounded-xl font-bold text-xs uppercase flex items-center gap-2 transition-all disabled:opacity-40 shadow-sm"
              >
                {isExportingExcuses ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={14} />
                )}
                Exportar Excel
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="p-6 border-b border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student filter */}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <User size={11} /> Filtrar por Alumno
                </label>
                <select
                  value={excuseFilterStudent}
                  onChange={e => setExcuseFilterStudent(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-teal-500"
                >
                  <option value="ALL">— Todos los Estudiantes —</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.nombre_original}{st.documento ? ` (${st.documento})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period mode */}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Calendar size={11} /> Período a Consultar
                </label>
                <div className="flex rounded-xl bg-gray-100 p-0.5">
                  {(['semester', 'month', 'range'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setExcuseFilterMode(mode)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        excuseFilterMode === mode
                          ? 'bg-white text-teal-700 shadow-xs'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {mode === 'semester' ? '🌐 Semestre' : mode === 'month' ? '📅 Mes' : '📆 Rango'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Month picker */}
            {excuseFilterMode === 'month' && (
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5">
                  Seleccionar Mes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExcuseFilterMonth('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      excuseFilterMonth === 'ALL'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-700'
                    }`}
                  >
                    Todos
                  </button>
                  {availableMonths.map(m => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setExcuseFilterMonth(m.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        excuseFilterMonth === m.key
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date range picker */}
            {excuseFilterMode === 'range' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Desde</label>
                  <input
                    type="date"
                    value={excuseFilterFrom}
                    onChange={e => setExcuseFilterFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Hasta</label>
                  <input
                    type="date"
                    value={excuseFilterTo}
                    onChange={e => setExcuseFilterTo(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Results Table */}
          {filteredExcuseItems.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Stethoscope size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold text-gray-500">Sin excusas para los filtros seleccionados</p>
              <p className="text-xs text-gray-400 mt-1">Ajusta el período o el alumno para ver resultados</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-teal-900 text-white">
                    <th className="px-3 py-2.5 font-black uppercase text-[10px] text-center w-10">#</th>
                    <th className="px-3 py-2.5 font-black uppercase text-[10px] min-w-[200px]">Estudiante</th>
                    <th className="px-3 py-2.5 font-black uppercase text-[10px] text-center">Documento</th>
                    <th className="px-3 py-2.5 font-black uppercase text-[10px] text-center">Fecha</th>
                    <th className="px-3 py-2.5 font-black uppercase text-[10px] text-center">Día</th>
                    <th className="px-3 py-2.5 font-black uppercase text-[10px]">Tipo</th>
                    <th className="px-3 py-2.5 font-black uppercase text-[10px]">Observación / Justificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExcuseItems.map((item, i) => (
                    <tr
                      key={`${item.studentId}_${item.sessionId}`}
                      className={`transition-colors ${
                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                      } hover:bg-teal-50/40`}
                    >
                      <td className="px-3 py-2 text-center text-gray-400 font-bold">{i + 1}</td>
                      <td className="px-3 py-2 font-bold text-gray-900">{item.studentName}</td>
                      <td className="px-3 py-2 text-center text-gray-500 font-medium">{item.studentDoc || '—'}</td>
                      <td className="px-3 py-2 text-center font-bold text-gray-700">
                        {item.fecha.split('-').reverse().join('/')}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500 font-medium capitalize">
                        {item.diaSemana.slice(0, 3)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          item.estado === 'EXCUSA_PRACTICAS_AIPI'
                            ? 'bg-fuchsia-100 text-fuchsia-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}>
                          {item.estado === 'EXCUSA_PRACTICAS_AIPI' ? 'Prácticas AIPI' : 'Médica (E)'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 font-medium max-w-[300px] truncate" title={item.observaciones}>
                        {item.observaciones || <span className="text-gray-300 italic">Sin observación</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer summary */}
          {filteredExcuseItems.length > 0 && (
            <div className="px-6 py-3 bg-teal-50 border-t border-teal-100 flex items-center justify-between text-xs text-teal-800 font-bold">
              <span>
                📋 {filteredExcuseItems.length} excusa{filteredExcuseItems.length !== 1 ? 's' : ''} en el reporte
                {excuseFilterStudent !== 'ALL' && ` • Alumno: ${students.find(s => s.id === excuseFilterStudent)?.nombre_original}`}
              </span>
              <button
                type="button"
                onClick={handleExportExcuses}
                disabled={isExportingExcuses}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isExportingExcuses ? <RefreshCw size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
                Exportar Reporte Excel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Missing September Warning Banner */}
      {!availableMonths.some(m => m.key >= '2026-09') && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex flex-wrap items-center justify-between gap-4 text-amber-900 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle size={22} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-black text-sm text-amber-950">Aviso de Calendario: Sin sesiones en Septiembre 2026</p>
              <p className="text-amber-800 font-medium">Este curso actualmente solo tiene programadas clases hasta {availableMonths[availableMonths.length - 1]?.label || 'meses anteriores'}. Puedes generar el calendario oficial de septiembre a diciembre con un solo clic.</p>
            </div>
          </div>
          {canModifyAll && (
            <button
              type="button"
              onClick={handleSyncCalendar}
              disabled={isSyncingCalendar}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <Plus size={14} />
              {isSyncingCalendar ? 'Generando sesiones...' : '📅 Generar Sesiones Septiembre - Diciembre'}
            </button>
          )}
        </div>
      )}

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

              {canModifyAll && (
                <button
                  type="button"
                  onClick={handleSyncCalendar}
                  disabled={isSyncingCalendar}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 border border-dashed border-emerald-300 transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer ml-1"
                  title="Sincronizar o generar meses faltantes"
                >
                  <Plus size={12} />
                  <span>{isSyncingCalendar ? 'Generando...' : '➕ Meses Faltantes'}</span>
                </button>
              )}
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">
            Matriculados
          </span>
          <span className="text-xl font-black text-fsm-blue mt-0.5 block">
            {students.length}
          </span>
        </div>

        {/* Clases Totales Card (Configurable) */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider">
              Clases Totales
            </span>
            {canEditTotalClasses ? (
              <button
                type="button"
                onClick={() => {
                  setInputTotalClasses(groupTotalClasses ? String(groupTotalClasses) : defaultProgramTotalClasses ? String(defaultProgramTotalClasses) : '');
                  setShowTotalClassesModal(true);
                }}
                className="text-fsm-blue hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                title="Modificar número total de clases/fechas del grupo"
              >
                <Edit3 size={11} /> Editar
              </button>
            ) : (
              <span className="text-gray-300 text-[10px]" title="Solo lectura">
                <Lock size={11} />
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-fsm-blue" title={`${taughtSessionsCount} clases dictadas a la fecha sobre ${effectiveTotalClasses} clases programadas del semestre`}>
              {taughtSessionsCount} <span className="text-xs font-bold text-gray-400">/ {effectiveTotalClasses}</span>
            </span>
            <span className="text-[9px] font-bold text-gray-400 truncate max-w-[90px]" title={groupTotalClasses ? 'Total personalizado para este grupo' : defaultProgramTotalClasses ? `Heredado de ${programName || 'Oferta Educativa'}` : 'Sesiones en calendario'}>
              {groupTotalClasses ? '• Personalizado' : defaultProgramTotalClasses ? '• Oferta' : '• Calendario'}
            </span>
          </div>
          <span className="block text-[9px] text-gray-400 font-semibold mt-0.5">
            {taughtSessionsCount} dictadas ({effectiveTotalClasses > 0 ? Math.min(100, Math.round((taughtSessionsCount / effectiveTotalClasses) * 100)) : 0}% avance)
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
              En Riesgo (≥{effectiveRiskThreshold} Fallas)
            </span>
            <div className="flex items-center gap-1">
              {groupMetrics.totalStudentsAtRisk > 0 && (
                <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-black animate-pulse">
                  ALERTA
                </span>
              )}
              {canEditRiskThreshold && (
                <button
                  type="button"
                  onClick={() => {
                    setInputRiskThreshold(groupRiskThreshold ? String(groupRiskThreshold) : '3');
                    setShowRiskThresholdModal(true);
                  }}
                  className="text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                  title="Modificar umbral de fallas para considerar al estudiante en riesgo"
                >
                  <Edit3 size={11} /> Editar
                </button>
              )}
            </div>
          </div>
          <span className="text-xl font-black text-red-700 mt-0.5 block">
            {groupMetrics.totalStudentsAtRisk}
          </span>
          {groupRiskThreshold !== null && (
            <span className="block text-[9px] text-red-500/70 font-semibold mt-0.5">
              • Umbral personalizado
            </span>
          )}
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
                <th className="p-3.5 text-[10px] font-black uppercase text-center bg-emerald-950/80 text-emerald-200 min-w-[85px]">
                  <div>% Asist.</div>
                  <div className="text-[8px] font-normal text-emerald-300/80 normal-case tracking-normal">
                    {selectedMonth !== 'ALL' ? 'Mes actual' : 'A la fecha'}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {displayedStudents.map((st, sIdx) => {
                let totalAbsents = 0;
                let totalLectivos = 0;
                let validAttendances = 0;
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
                      const isCB = (groupName || '').toUpperCase().includes('CB') || (tipo || '').toUpperCase().includes('CALENDARIO_B');
                      const isPreCB = isCB && s.fecha < '2026-09-01';
                      const holidayInfo = isColombiaHoliday(s.fecha);

                      let estado = record ? record.estado : (s.fecha >= todayStr ? 'PENDIENTE' : 'AUSENTE');
                      if (s.fecha === todayStr && (!record || record.estado === 'PENDIENTE')) {
                        estado = 'PENDIENTE';
                      } else if (isPreCB) {
                        estado = record?.estado && record.estado !== 'AUSENTE' ? record.estado : 'CALENDARIO_B';
                      } else if (holidayInfo.isHoliday) {
                        estado = record?.estado && record.estado !== 'AUSENTE' ? record.estado : 'FESTIVO';
                      } else if (s.fecha > todayStr && (!record || record.estado === 'PENDIENTE')) {
                        estado = 'PENDIENTE';
                      }

                      const cfg = STATUS_CONFIG[estado] || STATUS_CONFIG.PENDIENTE || STATUS_CONFIG.PRESENTE;

                      if (estado === 'AUSENTE') {
                        totalAbsents++;
                        totalLectivos++;
                      } else if (estado === 'PRESENTE' || estado === 'EXCUSA_MEDICA' || estado === 'EXCUSA_PRACTICAS_AIPI' || estado === 'PRACTICAS') {
                        totalLectivos++;
                        validAttendances++;
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
                            setSelectedExcuseType(estado === 'EXCUSA_PRACTICAS_AIPI' || groupName.toUpperCase().includes('AIPI') ? 'EXCUSA_PRACTICAS_AIPI' : 'EXCUSA_MEDICA');
                            setSelectedCell({
                              studentId: st.id,
                              sessionId: s.id,
                              currentEstado: estado,
                              studentName: st.nombre_original,
                              fechaStr: s.fecha,
                              observaciones: record?.observaciones,
                            });
                          }}
                          title={`${st.nombre_original} - ${formatDateDDMMYYYY(s.fecha)}: ${cfg.label} ${record?.observaciones ? `(${record.observaciones})` : ''} ${!canModifyAll ? '• Clic para registrar excusa' : '• Clic para alternar'}`}
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
                    {(() => {
                      const maxAllowedAbsences = effectiveTotalClasses > 0 
                        ? Math.max(3, Math.floor(effectiveTotalClasses * 0.15)) 
                        : 3;
                      const isAtRisk = totalAbsents >= effectiveRiskThreshold || (effectiveTotalClasses > 0 && selectedMonth === 'ALL' && (totalAbsents / effectiveTotalClasses) >= 0.15);

                      return (
                        <td className={`p-3 text-center font-black border-l ${
                          isFocused 
                            ? 'bg-amber-100/90 border-amber-300 text-red-800 text-sm' 
                            : isAtRisk 
                              ? 'bg-red-100/80 border-red-200 text-red-700' 
                              : totalAbsents > 0
                                ? 'bg-amber-50/60 border-gray-100 text-amber-800'
                                : 'bg-emerald-50/30 border-gray-100 text-emerald-700'
                        }`}>
                          <div 
                            className="flex items-center justify-center gap-1"
                            title={`${totalAbsents} inasistencias en el período.${selectedMonth === 'ALL' && effectiveTotalClasses > 0 ? ` Límite crítico (15%): ${maxAllowedAbsences} fallas sobre ${effectiveTotalClasses} clases programadas.` : ''}`}
                          >
                            {isAtRisk && <AlertTriangle size={13} className="text-red-600 animate-pulse shrink-0" />}
                            <span className="text-xs font-black">{totalAbsents}</span>
                          </div>
                          {isAtRisk && (
                            <span className="block text-[8px] font-extrabold uppercase tracking-tighter text-red-600 mt-0.5">
                              Riesgo
                            </span>
                          )}
                        </td>
                      );
                    })()}

                    {/* Attendance Percentage */}
                    {(() => {
                      const studentPct = totalLectivos > 0
                        ? Math.round((validAttendances / totalLectivos) * 100)
                        : null;

                      // Mirror the same risk logic as the Fallas column so both columns stay in sync
                      const isStudentAtRisk = totalAbsents >= effectiveRiskThreshold ||
                        (effectiveTotalClasses > 0 && selectedMonth === 'ALL' && (totalAbsents / effectiveTotalClasses) >= 0.15);

                      // Derived minimum attendance % that corresponds to the configured threshold
                      const riskPct = effectiveTotalClasses > 0 && effectiveRiskThreshold < effectiveTotalClasses
                        ? Math.round(((effectiveTotalClasses - effectiveRiskThreshold) / effectiveTotalClasses) * 100)
                        : null;

                      return (
                        <td className={`p-3 text-center font-black ${
                          isFocused 
                            ? 'bg-amber-100/90 text-emerald-900 text-sm' 
                            : isStudentAtRisk
                              ? 'bg-red-50 text-red-700 font-black'
                              : 'bg-emerald-50/40 text-emerald-700'
                        }`}>
                          {studentPct !== null ? (
                            <div title={`${validAttendances} asistencias válidas sobre ${totalLectivos} clases dictadas (${studentPct}% a la fecha).${riskPct !== null && selectedMonth === 'ALL' ? ` Mínimo requerido según umbral configurado (${effectiveRiskThreshold} fallas / ${effectiveTotalClasses} clases): ${riskPct}%.` : ''}`}>
                              <span className="text-xs font-black">{studentPct}%</span>
                              <span className="block text-[8px] font-semibold text-gray-400 mt-0.5">
                                {validAttendances}/{totalLectivos} {selectedMonth !== 'ALL' ? 'mes' : 'dict.'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                          {isStudentAtRisk && (
                            <span className="block text-[8px] font-extrabold uppercase tracking-tighter text-red-600 mt-0.5">
                              Riesgo
                            </span>
                          )}
                        </td>
                      );
                    })()}
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
                {canModifyAll ? 'Modificar Asistencia' : 'Registrar Excusa'}
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
                    placeholder="Ej. Incapacidad médica, práctica docente, calamidad..."
                    value={excuseObs}
                    onChange={(e) => setExcuseObs(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-fuchsia-50 border border-fuchsia-200 rounded-xl text-fuchsia-950 text-xs font-medium">
                  Selecciona el tipo de excusa para justificar esta inasistencia.
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1.5">Tipo de Excusa / Novedad</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedExcuseType('EXCUSA_MEDICA')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all flex flex-col items-center gap-1 ${
                        selectedExcuseType === 'EXCUSA_MEDICA' 
                          ? 'bg-teal-600 text-white border-teal-700 shadow-sm' 
                          : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                      }`}
                    >
                      <span className="text-sm">📋</span>
                      <span>Médica (E)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedExcuseType('EXCUSA_PRACTICAS_AIPI')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all flex flex-col items-center gap-1 ${
                        selectedExcuseType === 'EXCUSA_PRACTICAS_AIPI' 
                          ? 'bg-fuchsia-600 text-white border-fuchsia-700 shadow-sm' 
                          : 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-100'
                      }`}
                    >
                      <span className="text-sm">👶</span>
                      <span>Prácticas AIPI (PA)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">
                    {selectedExcuseType === 'EXCUSA_PRACTICAS_AIPI' ? 'Detalle de Prácticas AIPI *' : 'Detalle de Incapacidad Médica *'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={selectedExcuseType === 'EXCUSA_PRACTICAS_AIPI' ? 'Jardín infantil, horas de práctica pedagógica, observación...' : 'Número de incapacidad EPS, motivo médico o justificación...'}
                    value={excuseObs}
                    onChange={(e) => setExcuseObs(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectState(selectedExcuseType, excuseObs)}
                    disabled={isPending}
                    className={`w-full py-2.5 text-white rounded-xl font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                      selectedExcuseType === 'EXCUSA_PRACTICAS_AIPI'
                        ? 'bg-fuchsia-600 hover:bg-fuchsia-700'
                        : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    <FileText size={14} /> Guardar {selectedExcuseType === 'EXCUSA_PRACTICAS_AIPI' ? 'Excusa Prácticas AIPI' : 'Excusa Médica'}
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
                <option value="PRACTICAS">PRACTICAS — Prácticas Clínicas (Enfermería)</option>
                <option value="EXCUSA_PRACTICAS_AIPI">EXCUSA_PRACTICAS_AIPI — Excusa de Prácticas AIPI</option>
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

      {/* Modal de Importación Excel Directo a Curso */}
      <GroupExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        groupId={groupId}
        groupName={groupName}
        onSuccess={(count) => {
          showToast(`✓ Se matricularon exitosamente ${count} estudiantes en ${groupName}`);
          router.refresh();
        }}
      />

      {/* Modal para Modificar Clases Totales del Grupo */}
      {showTotalClassesModal && canEditTotalClasses && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-fsm-blue rounded-xl">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-fsm-blue uppercase">
                    Configurar Clases Totales
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Grupo: <span className="font-bold text-gray-800">{groupName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTotalClassesModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Define la meta programada de clases del semestre o módulo para este grupo. El porcentaje individual de cada alumno medirá su asistencia sobre las clases dictadas a la fecha, mientras que esta meta semestral proyecta el avance del curso y el límite crítico de fallas permitidas (15% según reglamento).
            </p>

            {defaultProgramTotalClasses && (
              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-2xl text-xs text-blue-950 flex items-start gap-2">
                <span className="text-sm">ℹ️</span>
                <div>
                  <p className="font-bold">Valor por defecto de la oferta educativa:</p>
                  <p className="text-[11px] text-blue-800 font-medium">
                    {programName || 'Programa'}: <strong>{defaultProgramTotalClasses} clases</strong>
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 block">
                Cantidad de Clases / Fechas Totales
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="365"
                  placeholder={`Ej. 20, 32, 40 (Actual: ${effectiveTotalClasses})`}
                  value={inputTotalClasses}
                  onChange={(e) => setInputTotalClasses(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm font-black text-fsm-blue outline-none focus:border-fsm-blue focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-gray-400">
                Sesiones programadas actualmente en el calendario: <strong>{sessions.length}</strong>
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={isSavingTotalClasses}
                onClick={() => {
                  const num = parseInt(inputTotalClasses, 10);
                  if (isNaN(num) || num <= 0) {
                    showToast('Ingresa un número válido mayor a 0', 'error');
                    return;
                  }
                  handleSaveTotalClasses(num);
                }}
                className="w-full py-3 bg-fsm-blue text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-fsm-red transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {isSavingTotalClasses ? <RefreshCw size={14} className="animate-spin" /> : 'Guardar Total de Clases'}
              </button>

              {groupTotalClasses !== null && (
                <button
                  type="button"
                  disabled={isSavingTotalClasses}
                  onClick={() => {
                    handleSaveTotalClasses(null);
                  }}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Restablecer a Modo Automático (Heredar)
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowTotalClassesModal(false)}
                className="w-full py-2 text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-wider"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Modificar Umbral de Fallas en Riesgo */}
      {showRiskThresholdModal && canEditRiskThreshold && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 text-red-700 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-red-700 uppercase">
                    Configurar Umbral de Riesgo
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Grupo: <span className="font-bold text-gray-800">{groupName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRiskThresholdModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Define cuántas fallas acumuladas debe tener un estudiante para ser marcado como &ldquo;En Riesgo&rdquo;. 
              El valor por defecto es <strong>3 fallas</strong>. Cambiar este umbral afecta únicamente a este grupo.
            </p>

            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <div>
                <p className="font-bold">Umbral actual:</p>
                <p className="text-[11px] text-amber-800 font-medium">
                  {groupRiskThreshold !== null
                    ? <>Personalizado: <strong>{effectiveRiskThreshold} fallas</strong></>  
                    : <>Por defecto: <strong>3 fallas</strong> (reglamentario)</>}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 block">
                Número de Fallas para Estado &ldquo;En Riesgo&rdquo;
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder={`Ej. 3, 4, 5 (Actual: ${effectiveRiskThreshold})`}
                  value={inputRiskThreshold}
                  onChange={(e) => setInputRiskThreshold(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm font-black text-red-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-gray-400">
                Un estudiante con este número o más de fallas aparecerá resaltado como &ldquo;En Riesgo&rdquo; en la matriz y en el conteo de la tarjeta superior.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={isSavingRiskThreshold}
                onClick={() => {
                  const num = parseInt(inputRiskThreshold, 10);
                  if (isNaN(num) || num <= 0) {
                    showToast('Ingresa un número válido mayor a 0', 'error');
                    return;
                  }
                  handleSaveRiskThreshold(num);
                }}
                className="w-full py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {isSavingRiskThreshold ? <RefreshCw size={14} className="animate-spin" /> : 'Guardar Umbral de Riesgo'}
              </button>

              {groupRiskThreshold !== null && (
                <button
                  type="button"
                  disabled={isSavingRiskThreshold}
                  onClick={() => {
                    handleSaveRiskThreshold(null);
                  }}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Restablecer al Valor por Defecto (3 Fallas)
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowRiskThresholdModal(false)}
                className="w-full py-2 text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-wider"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
