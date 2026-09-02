"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveAbsenceFollowup } from '@/app/actions';
import { 
  AlertTriangle, PhoneCall, PhoneOff, PhoneMissed, Phone, 
  Check, Save, Calendar, Filter, ArrowLeft, 
  ChevronRight, ExternalLink, ShieldCheck, MessageSquare, Bell, User, Layers
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
  activeCoursesScanned?: string[];
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
  activeCoursesScanned = [],
  absentStudents: initialStudents,
}: AbsenceFollowupClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedShift, setSelectedShift] = useState(initialShift);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [onlyActiveCoursesToday, setOnlyActiveCoursesToday] = useState(activeCoursesScanned.length > 0);
  
  // Local state for edits
  const [followupData, setFollowupData] = useState<Record<string, {
    seLlamo: boolean;
    estadoLlamada: string;
    comentarios: string;
    isSaving?: boolean;
    savedSuccess?: boolean;
  }>>(() => {
    const initialMap: Record<string, any> = {};
    initialStudents.forEach(s => {
      initialMap[s.student_id] = {
        seLlamo: s.se_llamo || false,
        estadoLlamada: s.estado_llamada || 'pendiente',
        comentarios: s.comentarios || '',
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
      excusaUrl: '',
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

  // Group filter
  const allGrados = Array.from(new Set(initialStudents.map(s => s.grado))).sort();
  const [filterGradoSpecific, setFilterGradoSpecific] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'FOLLOWUPS_ONLY' | 'ALL_UNMARKED'>('ALL_UNMARKED');

  const totalWithFollowup = initialStudents.filter(s => 
    s.followup_id || followupData[s.student_id]?.seLlamo || followupData[s.student_id]?.comentarios
  ).length;

  // Filter pipeline
  const filteredStudents = initialStudents.filter(s => {
    const data = followupData[s.student_id];

    if (onlyActiveCoursesToday && activeCoursesScanned.length > 0) {
      if (!activeCoursesScanned.includes(s.grado)) {
        return false;
      }
    }

    const matchesShift = selectedShift === 'ALL' || selectedShift === 'AUTO' || s.turno_calculado === selectedShift;
    const matchesGrado = !filterGradoSpecific || s.grado === filterGradoSpecific;
    const matchesSearch = !searchQuery || 
                          s.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.grado.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesShift || !matchesGrado || !matchesSearch) return false;

    const hasFollowupRecord = s.followup_id || data?.seLlamo || data?.comentarios;
    if (viewMode === 'FOLLOWUPS_ONLY' && !filterGradoSpecific && !searchQuery && !hasFollowupRecord) {
      return false;
    }

    if (statusFilter === 'PENDING') {
      return !data?.seLlamo || data?.estadoLlamada === 'pendiente' || data?.estadoLlamada === 'no_contesto';
    }
    if (statusFilter === 'CONTESTO') return data?.estadoLlamada === 'contesto';
    if (statusFilter === 'NO_CONTESTO') return data?.estadoLlamada === 'no_contesto' || data?.estadoLlamada === 'no_disponible';
    if (statusFilter === 'CON_NOVEDAD') return !!data?.comentarios?.trim();

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
        <span className="text-fsm-blue">Seguimiento Telefónico de Ausencias</span>
      </div>

      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-premium">
        <div>
          <span className="text-[10px] font-black text-fsm-red uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100">
            SISTEMA DE GESTIÓN Y CONTACTO TELEFÓNICO
          </span>
          <h1 className="text-3xl font-black text-fsm-blue uppercase tracking-tighter mt-2">
            ALERTAS DE AUSENCIAS
          </h1>
          <p className="text-gray-600 font-medium text-sm mt-1">
            Monitoreo diario de estudiantes inasistentes, registro de llamadas telefónicas y justificación de novedades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/attendance"
            className="px-6 py-3 bg-fsm-blue text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Volver a Asistencia
          </Link>
        </div>
      </div>

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
                Atención secretaría: Hay inasistencias registradas en el Turno Noche que requieren seguimiento telefónico.
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

          {/* Turno Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-2 rounded-2xl border border-gray-200">
            {[
              { id: 'AUTO', label: '⚡ Turno Actual' },
              { id: 'DIURNO', label: '☀️ Diurno' },
              { id: 'NOCHE', label: '🌙 Noche' },
              { id: 'SABADO', label: '📅 Sábado' },
              { id: 'ALL', label: '🌐 Todos' },
            ].map(shift => (
              <button
                key={shift.id}
                type="button"
                onClick={() => handleShiftChange(shift.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedShift === shift.id
                    ? 'bg-fsm-blue text-white shadow-sm font-black'
                    : 'text-gray-600 hover:text-gray-900 font-semibold'
                }`}
              >
                {shift.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filters Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Buscar por nombre de alumno o curso..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
              />
            </div>

            {/* Course Selector */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filterGradoSpecific}
                onChange={e => setFilterGradoSpecific(e.target.value)}
                className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none cursor-pointer"
              >
                <option value="">Todos los Salones</option>
                {allGrados.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
              <span className="text-[10px] font-black uppercase text-gray-400">Estado:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none cursor-pointer"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="PENDING">Pendientes por Llamar</option>
                <option value="CONTESTO">Llamada Contestada</option>
                <option value="NO_CONTESTO">No Contestó / No Disponible</option>
                <option value="CON_NOVEDAD">Con Observación Registrada</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle Switch */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 self-stretch lg:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('FOLLOWUPS_ONLY')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'FOLLOWUPS_ONLY'
                    ? 'bg-white text-fsm-blue shadow-sm font-black'
                    : 'text-gray-600 hover:text-gray-900 font-semibold'
                }`}
              >
                📋 Con Novedades ({totalWithFollowup})
              </button>
              <button
                type="button"
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

                  {/* Right Column: Comments / Observations */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-fsm-blue uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare size={14} /> Observaciones / Justificación de la Ausencia
                    </label>

                    <textarea
                      rows={3}
                      value={data.comentarios}
                      onChange={e => handleFieldChange(student.student_id, 'comentarios', e.target.value)}
                      placeholder="Escribe aquí el detalle de la llamada o justificación (ej: Madre informa cita médica, solicita permiso por 3 días...)"
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs font-medium text-gray-800 outline-none focus:border-fsm-blue focus:ring-2 focus:ring-fsm-blue/20 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Card Action Footer with Direct Links */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
                  {/* Direct Jump Links */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Link
                      href={`/admin/attendance?search=${encodeURIComponent(student.nombre)}`}
                      className="px-3.5 py-2 bg-blue-50 text-fsm-blue hover:bg-fsm-blue hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 border border-blue-200 shadow-2xs"
                    >
                      <Layers size={13} />
                      <span>Ver en Asistencia</span>
                      <ExternalLink size={12} />
                    </Link>

                    <Link
                      href={`/admin/attendance/students/${student.student_id}`}
                      className="px-3.5 py-2 bg-gray-100 text-gray-700 hover:bg-gray-800 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 border border-gray-200 shadow-2xs"
                    >
                      <User size={13} />
                      <span>Historial</span>
                    </Link>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    {data.savedSuccess && (
                      <span className="text-green-600 font-bold text-xs flex items-center gap-1">
                        <Check size={14} /> Guardado
                      </span>
                    )}

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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
