"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { saveAbsenceFollowup } from '@/app/actions';
import { 
  AlertTriangle, PhoneCall, PhoneOff, PhoneMissed, Phone, 
  FileText, Upload, Check, Save, Calendar, Filter, ArrowLeft, 
  ChevronRight, ExternalLink, ShieldCheck, UserX, Clock, MessageSquare, Bell, Users
} from 'lucide-react';

interface AbsentStudent {
  student_id: string;
  nombre: string;
  grado: string;
  telefono: string | null;
  rfid_tag_uid: string | null;
  turno_calculado: string;
  followup_id: string | null;
  se_llamo: boolean | null;
  estado_llamada: string | null;
  comentarios: string | null;
  excusa_url: string | null;
  registrado_por: string | null;
  fecha_seguimiento: string | null;
}

interface AbsenceFollowupClientProps {
  initialDate: string;
  initialShift: string;
  totalScansOnDate?: number;
  isFutureOrZeroScan?: boolean;
  dayOfWeek?: number;
  isWeekday?: boolean;
  isSaturday?: boolean;
  isSunday?: boolean;
  absentStudents: AbsentStudent[];
}

export default function AbsenceFollowupClient({
  initialDate,
  initialShift,
  totalScansOnDate = 0,
  isFutureOrZeroScan = false,
  dayOfWeek = 1,
  isWeekday = true,
  isSaturday = false,
  isSunday = false,
  absentStudents: initialStudents,
}: AbsenceFollowupClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedShift, setSelectedShift] = useState(initialShift);
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Local state for edits
  const [followupData, setFollowupData] = useState<Record<string, {
    seLlamo: boolean;
    estadoLlamada: string;
    comentarios: string;
    excusaUrl: string;
    isUploading?: boolean;
    isSaving?: boolean;
    savedSuccess?: boolean;
  }>>(() => {
    const initialMap: Record<string, any> = {};
    initialStudents.forEach(s => {
      initialMap[s.student_id] = {
        seLlamo: s.se_llamo || false,
        estadoLlamada: s.estado_llamada || 'pendiente',
        comentarios: s.comentarios || '',
        excusaUrl: s.excusa_url || '',
      };
    });
    return initialMap;
  });

  const [globalStatusMsg, setGlobalStatusMsg] = useState({ text: '', type: '' });

  const showGlobalStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setGlobalStatusMsg({ text, type });
    setTimeout(() => setGlobalStatusMsg({ text: '', type: '' }), 5000);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    router.push(`/admin/attendance/absences?date=${newDate}&shift=${selectedShift}`);
  };

  const handleShiftChange = (shift: string) => {
    setSelectedShift(shift);
    router.push(`/admin/attendance/absences?date=${selectedDate}&shift=${shift}`);
  };

  const handleFieldChange = (studentId: string, field: string, value: any) => {
    setFollowupData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
        savedSuccess: false,
      }
    }));
  };

  const handleFileUpload = async (studentId: string, file: File) => {
    setFollowupData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], isUploading: true }
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error al subir archivo de excusa');
      const data = await res.json();

      setFollowupData(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          excusaUrl: data.url,
          isUploading: false,
        }
      }));

      showGlobalStatus('✓ Archivo de excusa adjuntado correctamente');
    } catch (err: any) {
      setFollowupData(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], isUploading: false }
      }));
      showGlobalStatus(err.message || 'Error al cargar archivo', 'error');
    }
  };

  const handleSaveStudentFollowup = async (student: AbsentStudent) => {
    const data = followupData[student.student_id];
    if (!data) return;

    setFollowupData(prev => ({
      ...prev,
      [student.student_id]: { ...prev[student.student_id], isSaving: true }
    }));

    const res = await saveAbsenceFollowup({
      studentId: student.student_id,
      fecha: selectedDate,
      turno: student.turno_calculado,
      seLlamo: data.seLlamo,
      estadoLlamada: data.estadoLlamada,
      comentarios: data.comentarios,
      excusaUrl: data.excusaUrl,
    });

    setFollowupData(prev => ({
      ...prev,
      [student.student_id]: { 
        ...prev[student.student_id], 
        isSaving: false,
        savedSuccess: res.success,
      }
    }));

    if (res.success) {
      showGlobalStatus(`✓ Seguimiento guardado para ${student.nombre}`);
      router.refresh();
    } else {
      showGlobalStatus(res.error || 'Error al guardar seguimiento', 'error');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterGradoSpecific, setFilterGradoSpecific] = useState('');
  const [viewMode, setViewMode] = useState<'FOLLOWUPS_ONLY' | 'ALL_UNMARKED'>('ALL_UNMARKED');

  // Sync state when server props change
  React.useEffect(() => {
    setSelectedDate(initialDate);
    setSelectedShift(initialShift);
  }, [initialDate, initialShift]);

  React.useEffect(() => {
    setFollowupData(prev => {
      const updatedMap: Record<string, any> = { ...prev };
      initialStudents.forEach(s => {
        if (!updatedMap[s.student_id]) {
          updatedMap[s.student_id] = {
            seLlamo: s.se_llamo || false,
            estadoLlamada: s.estado_llamada || 'pendiente',
            comentarios: s.comentarios || '',
            excusaUrl: s.excusa_url || '',
          };
        }
      });
      return updatedMap;
    });
  }, [initialStudents]);

  const distinctGrados = Array.from(new Set(initialStudents.map(s => s.grado))).sort();

  const totalWithFollowup = initialStudents.filter(s => 
    s.followup_id || followupData[s.student_id]?.seLlamo || followupData[s.student_id]?.comentarios || followupData[s.student_id]?.excusaUrl
  ).length;

  // Filter students based on UI filters
  const filteredStudents = initialStudents.filter(s => {
    const data = followupData[s.student_id];
    const matchesShift = selectedShift === 'ALL' || selectedShift === 'AUTO' || s.turno_calculado === selectedShift;
    const matchesGrado = !filterGradoSpecific || s.grado === filterGradoSpecific;
    const matchesSearch = !searchQuery || 
                          s.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.grado.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesShift || !matchesGrado || !matchesSearch) return false;

    // If viewMode is FOLLOWUPS_ONLY and no specific course or search query is set,
    // only show students who have a followup record or call/comment/excuse
    const hasFollowupRecord = s.followup_id || data?.seLlamo || data?.comentarios || data?.excusaUrl;
    if (viewMode === 'FOLLOWUPS_ONLY' && !filterGradoSpecific && !searchQuery && !hasFollowupRecord) {
      return false;
    }

    if (statusFilter === 'PENDING') {
      return !data?.seLlamo || data?.estadoLlamada === 'pendiente' || data?.estadoLlamada === 'no_contesto';
    }
    if (statusFilter === 'CONTESTO') return data?.estadoLlamada === 'contesto';
    if (statusFilter === 'NO_CONTESTO') return data?.estadoLlamada === 'no_contesto';
    if (statusFilter === 'EXCUSA') return !!data?.excusaUrl;

    return true;
  });

  const pendingNightCount = initialStudents.filter(s => 
    s.turno_calculado === 'NOCHE' && (!s.se_llamo || s.estado_llamada === 'pendiente' || s.estado_llamada === 'no_contesto')
  ).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-gray-700">
        <Link href="/admin/attendance" className="hover:text-fsm-red transition-colors flex items-center gap-2">
          <ArrowLeft size={14} /> Control de Asistencia
        </Link>
        <ChevronRight size={14} />
        <span className="text-fsm-blue">Seguimiento de Ausencias y Excusas</span>
      </div>

      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-premium">
        <div>
          <span className="text-[10px] font-black text-fsm-red uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100">
            SISTEMA DE GESTIÓN Y SEGUIMIENTO TELEFÓNICO
          </span>
          <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mt-2">
            ALERTAS DE AUSENCIAS Y EXCUSAS
          </h1>
          <p className="text-gray-600 font-medium text-sm mt-1">
            Monitoreo diario de estudiantes inasistentes, registro de llamadas telefónicas y adjunto de justificantes.
          </p>
        </div>

        <Link
          href="/admin/attendance"
          className="px-6 py-3 bg-fsm-blue text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md flex items-center gap-2 self-start md:self-auto"
        >
          <ArrowLeft size={16} /> Volver a Asistencia
        </Link>
      </div>

      {/* Shift Schedule Applicability Banners */}
      {isWeekday && selectedShift === 'SABADO' && (
        <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-[2rem] shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-fsm-blue text-white rounded-2xl flex items-center justify-center shrink-0 font-black shadow-md">
            <Calendar size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest bg-white px-2.5 py-0.5 rounded border border-blue-200">
              PROGRAMACIÓN ACADÉMICA DE JORNADA
            </span>
            <h3 className="text-base font-black text-fsm-blue uppercase mt-0.5">
              Sin clases programadas para el Turno Sábado en días entre semana ({selectedDate})
            </h3>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">
              Las clases del Turno Sábado se dictan exclusivamente los sábados. Selecciona el Turno Diurno o Noche para ver las ausencias del día de hoy.
            </p>
          </div>
        </div>
      )}

      {isSaturday && (selectedShift === 'DIURNO' || selectedShift === 'NOCHE') && (
        <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-[2rem] shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-fsm-blue text-white rounded-2xl flex items-center justify-center shrink-0 font-black shadow-md">
            <Calendar size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest bg-white px-2.5 py-0.5 rounded border border-blue-200">
              PROGRAMACIÓN ACADÉMICA DE JORNADA
            </span>
            <h3 className="text-base font-black text-fsm-blue uppercase mt-0.5">
              Sin clases programadas para Turnos Diurno / Noche los días sábados ({selectedDate})
            </h3>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">
              Las clases de los Turnos Diurno y Noche se dictan de Lunes a Viernes. Selecciona el Turno Sábado para ver las ausencias de hoy.
            </p>
          </div>
        </div>
      )}

      {isSunday && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 font-black shadow-md">
            <Calendar size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest bg-white px-2.5 py-0.5 rounded border border-amber-200">
              DÍA DOMINGO DE DESCANSO
            </span>
            <h3 className="text-base font-black text-amber-900 uppercase mt-0.5">
              Sin actividades académicas programadas para los días Domingo
            </h3>
            <p className="text-xs font-semibold text-amber-800 mt-0.5">
              Los domingos no hay actividades académicas ni lecturas de asistencia programadas.
            </p>
          </div>
        </div>
      )}

      {/* Zero Scans / Future Date Info Banner */}
      {totalScansOnDate === 0 && !isSunday && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 font-black shadow-md">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest bg-white px-2.5 py-0.5 rounded border border-amber-200">
              INFORMACIÓN DE FECHA SELECCIONADA
            </span>
            <h3 className="text-base font-black text-amber-900 uppercase mt-0.5">
              Sin lecturas de asistencia registradas para {selectedDate}
            </h3>
            <p className="text-xs font-medium text-amber-800 mt-0.5">
              Aún no hay escaneos de tarjeta en pasillos para este día. Selecciona la fecha actual o un día de clases para ver la asistencia en tiempo real.
            </p>
          </div>
        </div>
      )}

      {/* Inter-Shift Handover Alert Banner */}
      {pendingNightCount > 0 && (
        <div className="bg-blue-50/80 border-2 border-blue-200 p-6 rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-fsm-blue text-white rounded-2xl flex items-center justify-center shrink-0 font-black shadow-md">
              <Bell size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest bg-white px-2.5 py-0.5 rounded border border-blue-200">
                NOTIFICACIÓN DE TRASPASO ENTRE TURNOS
              </span>
              <h3 className="text-lg font-black text-fsm-blue uppercase mt-0.5">
                {pendingNightCount} ALUMNO(S) DEL TURNO NOCHE PENDIENTES POR CONTACTAR
              </h3>
              <p className="text-xs font-semibold text-gray-700">
                Atención personal administrativo: Hay inasistencias registradas en el Turno Noche que requieren seguimiento telefónico en este turno.
              </p>
            </div>
          </div>

          <button
            onClick={() => { setSelectedShift('NOCHE'); setViewMode('ALL_UNMARKED'); }}
            className="px-5 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-sm shrink-0"
          >
            Ver Turno Noche
          </button>
        </div>
      )}

      {/* Global Status Message */}
      {globalStatusMsg.text && (
        <div className={`p-4 rounded-2xl border font-bold text-xs uppercase tracking-widest transition-all ${
          globalStatusMsg.type === 'error' ? 'bg-red-50 text-fsm-red border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {globalStatusMsg.text}
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium space-y-4">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Date Selector with Hoy shortcut */}
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Calendar size={16} className="text-fsm-blue shrink-0" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fecha:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="bg-transparent font-bold text-xs text-fsm-blue outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Bogota' });
                setSelectedDate(todayStr);
                router.push(`/admin/attendance/absences?date=${todayStr}&shift=${selectedShift}`);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                selectedDate === new Date().toLocaleDateString('sv', { timeZone: 'America/Bogota' })
                  ? 'bg-fsm-blue text-white border-fsm-blue shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              📅 Hoy
            </button>
          </div>

          {/* Search Input */}
          <div className="flex-1 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar estudiante por nombre o grado..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 placeholder-gray-400 outline-none w-full"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Reset Filters Button (visible when filters active) */}
          {(filterGradoSpecific || searchQuery || statusFilter !== 'ALL' || (selectedShift !== 'ALL' && selectedShift !== 'AUTO')) && (
            <button
              type="button"
              onClick={() => {
                setFilterGradoSpecific('');
                setSearchQuery('');
                setStatusFilter('ALL');
                handleShiftChange('ALL');
              }}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-fsm-red rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border border-gray-200 flex items-center justify-center gap-1.5 shrink-0"
            >
              🔄 Limpiar Filtros
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-3 border-t border-gray-100">
          {/* Specific Course / Grado Selector */}
          <div className="flex items-center gap-2 bg-blue-50/80 px-4 py-2.5 rounded-2xl border-2 border-blue-300">
            <Users size={16} className="text-fsm-blue shrink-0" />
            <select
              value={filterGradoSpecific}
              onChange={e => setFilterGradoSpecific(e.target.value)}
              className="bg-transparent font-black text-xs uppercase text-fsm-blue outline-none cursor-pointer"
            >
              <option value="">🏫 Filtrar por Curso / Salón...</option>
              {distinctGrados.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-200">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDING">Pendientes por Llamar</option>
              <option value="CONTESTO">Contestó</option>
              <option value="NO_CONTESTO">No Contestó</option>
              <option value="EXCUSA">Con Excusa Adjunta</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-3 border-t border-gray-100">
          {/* Turno Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'Todos los Turnos' },
              { id: 'NOCHE', label: '🌙 Turno Noche' },
              { id: 'DIURNO', label: '☀️ Turno Diurno' },
              { id: 'SABADO', label: '📅 Turno Sábado' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleShiftChange(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                  selectedShift === tab.id
                    ? 'bg-fsm-blue text-white border-fsm-blue shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle Switch */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 self-stretch lg:self-auto">
            <button
              onClick={() => setViewMode('FOLLOWUPS_ONLY')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'FOLLOWUPS_ONLY'
                  ? 'bg-white text-fsm-blue shadow-sm font-black'
                  : 'text-gray-600 hover:text-gray-900 font-semibold'
              }`}
            >
              📋 Novedades Registradas ({totalWithFollowup})
            </button>
            <button
              onClick={() => setViewMode('ALL_UNMARKED')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'ALL_UNMARKED'
                  ? 'bg-white text-fsm-blue shadow-sm font-black'
                  : 'text-gray-600 hover:text-gray-900 font-semibold'
              }`}
            >
              🌐 Sin Marcación ({initialStudents.length})
            </button>
          </div>
        </div>
      </div>

      {/* Counter Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-black text-gray-700 uppercase tracking-widest px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-fsm-blue animate-pulse"></span>
          <span>
            {filterGradoSpecific 
              ? `Curso ${filterGradoSpecific}: ${filteredStudents.length} Inasistente(s) Registrados` 
              : `Inasistencias Mostradas: ${filteredStudents.length} Estudiante(s)`}
          </span>
        </div>
        <span className="text-gray-400 font-medium">Fecha: {selectedDate}</span>
      </div>

      {/* Absent Students Cards Grid */}
      <div className="space-y-6">
        {filteredStudents.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-[2.5rem] border border-gray-100 shadow-premium space-y-3">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
              <ShieldCheck size={36} />
            </div>
            <h3 className="text-lg font-black text-fsm-blue uppercase">NO HAY AUSENCIAS PENDIENTES CON ESTOS FILTROS</h3>
            <p className="text-xs font-semibold text-gray-500 max-w-md mx-auto">
              Todos los estudiantes del turno seleccionado asistieron a clase o ya tienen su seguimiento telefónico registrado.
            </p>
          </div>
        ) : (
          filteredStudents.map(student => {
            const data = followupData[student.student_id] || {
              seLlamo: false,
              estadoLlamada: 'pendiente',
              comentarios: '',
              excusaUrl: '',
            };

            const isNight = student.turno_calculado === 'NOCHE';

            return (
              <div
                key={student.student_id}
                className={`bg-white rounded-[2.5rem] p-6 md:p-8 border shadow-premium transition-all space-y-6 ${
                  isNight ? 'border-amber-200 bg-amber-50/10' : 'border-gray-100'
                }`}
              >
                {/* Student Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded border ${
                        isNight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-fsm-blue/5 text-fsm-blue border-fsm-blue/10'
                      }`}>
                        {isNight ? '🌙 Turno Noche' : student.turno_calculado === 'SABADO' ? '📅 Turno Sábado' : '☀️ Turno Diurno'}
                      </span>
                      <span className="text-[9px] font-black text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">
                        Grado: {student.grado}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-fsm-blue uppercase mt-1">
                      {student.nombre}
                    </h3>
                  </div>

                  {/* Phone Display / Trigger */}
                  <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-200">
                    <Phone size={16} className="text-fsm-blue" />
                    <div>
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Teléfono de Contacto</div>
                      <div className="text-sm font-bold text-gray-800">
                        {student.telefono ? (
                          <a href={`tel:${student.telefono}`} className="hover:text-fsm-blue underline decoration-dashed">
                            {student.telefono}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">No registrado</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Controls Body */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Call Status Options */}
                  <div className="space-y-4">
                    <label className="text-xs font-black text-fsm-blue uppercase tracking-wider flex items-center gap-1.5">
                      <PhoneCall size={14} /> Estado de la Llamada Telefónica
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'contesto', label: 'Contestó', icon: PhoneCall, color: 'hover:bg-green-50 hover:border-green-300' },
                        { id: 'no_contesto', label: 'No Contestó', icon: PhoneMissed, color: 'hover:bg-amber-50 hover:border-amber-300' },
                        { id: 'no_disponible', label: 'No Disponible', icon: PhoneOff, color: 'hover:bg-red-50 hover:border-red-300' },
                      ].map(opt => {
                        const isSelected = data.seLlamo && data.estadoLlamada === opt.id;
                        const Icon = opt.icon;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              handleFieldChange(student.student_id, 'seLlamo', true);
                              handleFieldChange(student.student_id, 'estadoLlamada', opt.id);
                            }}
                            className={`p-3 rounded-2xl border text-xs font-bold uppercase transition-all flex flex-col items-center gap-1.5 text-center ${opt.color} ${
                              isSelected
                                ? 'bg-fsm-blue text-white border-fsm-blue shadow-md'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            <Icon size={18} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 pt-1">
                      <input
                        type="checkbox"
                        id={`se_llamo_${student.student_id}`}
                        checked={data.seLlamo}
                        onChange={e => {
                          handleFieldChange(student.student_id, 'seLlamo', e.target.checked);
                          if (!e.target.checked) {
                            handleFieldChange(student.student_id, 'estadoLlamada', 'pendiente');
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-fsm-blue focus:ring-fsm-blue cursor-pointer"
                      />
                      <label htmlFor={`se_llamo_${student.student_id}`} className="cursor-pointer">
                        Marcar como verificado por el personal de secretaría
                      </label>
                    </div>
                  </div>

                  {/* Right Column: Excusa File Attachment */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-fsm-blue uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} /> Adjuntar Excusa / Justificante Médico
                    </label>

                    {data.excusaUrl ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Check size={18} className="text-green-600" />
                          <div>
                            <div className="text-xs font-bold text-green-900">Excusa Adjunta Correctamente</div>
                            <a
                              href={data.excusaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-bold text-fsm-blue hover:underline flex items-center gap-1 mt-0.5"
                            >
                              Ver Documento Adjunto <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleFieldChange(student.student_id, 'excusaUrl', '')}
                          className="text-xs text-fsm-red font-bold hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <div className="relative border-2 border-dashed border-gray-200 hover:border-fsm-blue rounded-2xl p-4 text-center transition-all bg-gray-50/60">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(student.student_id, e.target.files[0]);
                            }
                          }}
                          disabled={data.isUploading}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                        <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                        <div className="text-xs font-bold text-gray-700">
                          {data.isUploading ? 'Subiendo archivo...' : 'Haz clic o arrastra aquí la excusa (PDF o Imagen)'}
                        </div>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Formatos permitidos: PDF, PNG, JPG</p>
                      </div>
                    )}
                  </div>

                  {/* Comments / Observations TextArea */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-fsm-blue uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare size={14} /> Observaciones / Comentarios de la Llamada
                    </label>

                    <textarea
                      rows={2}
                      value={data.comentarios}
                      onChange={e => handleFieldChange(student.student_id, 'comentarios', e.target.value)}
                      placeholder="Escribe aquí el detalle de la conversación con el alumno o acudiente (ej: Madre informa cita médica, solicita incapacidad por 3 días...)"
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs font-medium text-gray-800 outline-none focus:border-fsm-blue focus:ring-2 focus:ring-fsm-blue/20 transition-all"
                    />
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
                  <div className="text-[11px] font-semibold text-gray-400">
                    {data.savedSuccess ? (
                      <span className="text-green-600 font-bold flex items-center gap-1">
                        <Check size={14} /> Guardado con éxito
                      </span>
                    ) : (
                      'Recuerda hacer clic en "Guardar Seguimiento" tras modificar'
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveStudentFollowup(student)}
                    disabled={data.isSaving}
                    className="px-6 py-2.5 bg-fsm-blue text-white hover:bg-fsm-red rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50 w-full sm:w-auto justify-center"
                  >
                    <Save size={14} /> {data.isSaving ? 'Guardando...' : 'Guardar Seguimiento'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
