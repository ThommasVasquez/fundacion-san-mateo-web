'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Plus, X, BookOpen, Calendar, Clock, CheckCircle2, 
  AlertCircle, RefreshCw, ArrowRight, Sparkles, Layers, ShieldCheck
} from 'lucide-react';
import { createGroupAction, CreateGroupInput } from '@/app/actions';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: { groupId: string; groupName: string; sessionsCount: number }) => void;
}

const PROGRAMS = [
  {
    code: 'TAE',
    name: 'Técnico Laboral en Auxiliar de Enfermería',
    shortName: 'Enfermería TAE',
    icon: '🩺',
    maxSemesters: 3,
    color: 'from-blue-600 to-cyan-600',
  },
  {
    code: 'AIPI',
    name: 'Atención Integral a la Primera Infancia',
    shortName: 'Primera Infancia AIPI',
    icon: '👶',
    maxSemesters: 2,
    color: 'from-fuchsia-600 to-pink-600',
  },
  {
    code: 'PREESCOLAR',
    name: 'Técnico Auxiliar en Preescolar',
    shortName: 'Preescolar',
    icon: '🎒',
    maxSemesters: 2,
    color: 'from-amber-600 to-orange-600',
  },
];

const DAYS_OF_WEEK = [
  { day: 1, label: 'Lunes', short: 'Lun' },
  { day: 2, label: 'Martes', short: 'Mar' },
  { day: 3, label: 'Miércoles', short: 'Mié' },
  { day: 4, label: 'Jueves', short: 'Jue' },
  { day: 5, label: 'Viernes', short: 'Vie' },
  { day: 6, label: 'Sábado', short: 'Sáb' },
  { day: 0, label: 'Domingo', short: 'Dom' },
];

export default function CreateGroupModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateGroupModalProps) {
  const router = useRouter();

  // Form State
  const [programaCodigo, setProgramaCodigo] = useState('TAE');
  const [semestre, setSemestre] = useState<'I' | 'II' | 'III'>('I');
  const [jornada, setJornada] = useState<'DIURNO' | 'NOCHE' | 'SABADO'>('DIURNO');
  const [tipo, setTipo] = useState<'REGULAR' | 'CB'>('REGULAR');
  const [paralelo, setParalelo] = useState('A');
  const [customName, setCustomName] = useState('');
  const [isCustomName, setIsCustomName] = useState(false);

  // Dates
  const [startDate, setStartDate] = useState('2026-02-01');
  const [endDate, setEndDate] = useState('2026-11-30');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [totalClasesCustom, setTotalClasesCustom] = useState<string>('');

  // Loading & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdGroup, setCreatedGroup] = useState<{
    groupId: string;
    groupName: string;
    sessionsCount: number;
  } | null>(null);

  // Sync default schedule days when jornada changes
  useEffect(() => {
    if (jornada === 'SABADO') {
      setSelectedDays([6]);
    } else {
      setSelectedDays([1, 2, 3, 4, 5]);
    }
  }, [jornada]);

  // Sync available semesters when program changes
  useEffect(() => {
    const prog = PROGRAMS.find(p => p.code === programaCodigo);
    if (prog && prog.maxSemesters === 2 && semestre === 'III') {
      setSemestre('II');
    }
  }, [programaCodigo, semestre]);

  // Suggested group name calculation
  const suggestedName = useMemo(() => {
    let name = `${semestre} `;
    if (programaCodigo === 'PREESCOLAR') {
      name += `PREESCOLAR`;
    } else if (programaCodigo === 'AIPI') {
      name += `AIPI`;
    } else {
      // TAE
      name += `${jornada}`;
      if (paralelo) name += ` ${paralelo}`;
    }

    if (tipo === 'CB') {
      name += ` CB`;
    }

    return name.trim();
  }, [semestre, programaCodigo, jornada, paralelo, tipo]);

  const activeName = isCustomName ? customName : suggestedName;

  // Calculate estimated sessions count
  const estimatedSessions = useMemo(() => {
    if (!startDate || !endDate) return 0;
    try {
      const s = new Date(startDate + 'T12:00:00Z');
      const e = new Date(endDate + 'T12:00:00Z');
      if (s > e) return 0;
      let count = 0;
      let curr = new Date(s);
      while (curr <= e) {
        if (selectedDays.includes(curr.getUTCDay())) {
          count++;
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
      return count;
    } catch {
      return 0;
    }
  }, [startDate, endDate, selectedDays]);

  if (!isOpen) return null;

  const resetForm = () => {
    setProgramaCodigo('TAE');
    setSemestre('I');
    setJornada('DIURNO');
    setTipo('REGULAR');
    setParalelo('A');
    setCustomName('');
    setIsCustomName(false);
    setStartDate('2026-02-01');
    setEndDate('2026-11-30');
    setSelectedDays([1, 2, 3, 4, 5]);
    setTotalClasesCustom('');
    setErrorMsg(null);
    setCreatedGroup(null);
    setIsSubmitting(false);
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activeName.trim()) {
      setErrorMsg('El nombre del curso es obligatorio');
      return;
    }

    if (selectedDays.length === 0) {
      setErrorMsg('Debes seleccionar al menos un día de clase a la semana para generar las sesiones.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTotal = parseInt(totalClasesCustom, 10);
      const input: CreateGroupInput = {
        nombre: activeName.trim(),
        programaCodigo,
        semestreRomano: semestre,
        jornada,
        tipo,
        startDate,
        endDate,
        selectedDays,
        totalClases: !isNaN(parsedTotal) && parsedTotal > 0 ? parsedTotal : undefined,
      };

      const res = await createGroupAction(input);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.success && res.groupId) {
        setCreatedGroup({
          groupId: res.groupId,
          groupName: res.groupName || activeName,
          sessionsCount: res.sessionsCount || 0,
        });
        if (onSuccess) {
          onSuccess({
            groupId: res.groupId,
            groupName: res.groupName || activeName,
            sessionsCount: res.sessionsCount || 0,
          });
        }
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al crear el curso');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
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
                GESTIÓN ACADÉMICA INSTITUCIONAL
              </span>
              <h2 className="text-lg font-black uppercase tracking-tight text-white leading-tight">
                CREAR NUEVO CURSO / GRUPO
              </h2>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-800">
          {/* Error */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-fsm-red font-bold text-xs uppercase flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Éxito */}
          {createdGroup ? (
            <div className="p-8 text-center space-y-4 bg-emerald-50 border border-emerald-200 rounded-3xl animate-in fade-in duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  CURSO OFICIAL CREADO
                </span>
                <h3 className="text-xl font-black text-emerald-950 uppercase mt-2">
                  ¡{createdGroup.groupName}!
                </h3>
                <p className="text-xs font-semibold text-emerald-800 mt-1">
                  Se autogeneraron exitosamente <strong>{createdGroup.sessionsCount} sesiones de clase</strong> en el calendario académico institucional.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href={`/admin/attendance/group/${createdGroup.groupId}`}
                  onClick={() => { resetForm(); onClose(); }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-fsm-blue hover:bg-fsm-red text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <BookOpen size={15} />
                  <span>Ver Matriz de Asistencia</span>
                </Link>

                <button
                  type="button"
                  onClick={() => { resetForm(); onClose(); }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Programa Académico */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-2">
                  1. Programa Académico *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PROGRAMS.map(prog => (
                    <button
                      type="button"
                      key={prog.code}
                      onClick={() => setProgramaCodigo(prog.code)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                        programaCodigo === prog.code
                          ? 'bg-blue-50/80 border-fsm-blue ring-2 ring-fsm-blue/20 text-fsm-blue'
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="text-2xl">{prog.icon}</span>
                      <div>
                        <p className="text-xs font-black uppercase">{prog.shortName}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{prog.maxSemesters} Semestres</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Semestre, Jornada y Tipo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Semestre */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1.5">
                    2. Semestre *
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl">
                    {(['I', 'II', 'III'] as const).map(sem => {
                      const max = PROGRAMS.find(p => p.code === programaCodigo)?.maxSemesters || 3;
                      const disabled = max === 2 && sem === 'III';
                      return (
                        <button
                          type="button"
                          key={sem}
                          disabled={disabled}
                          onClick={() => setSemestre(sem)}
                          className={`py-2 text-xs font-black uppercase rounded-lg transition-all ${
                            semestre === sem
                              ? 'bg-white text-fsm-blue shadow-xs'
                              : disabled
                              ? 'opacity-30 cursor-not-allowed text-gray-400'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {sem}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Jornada */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1.5">
                    3. Jornada *
                  </label>
                  <select
                    value={jornada}
                    onChange={(e) => setJornada(e.target.value as any)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
                  >
                    <option value="DIURNO">DIURNO (Lunes a Viernes Mañana)</option>
                    <option value="NOCHE">NOCHE (Lunes a Viernes Noche)</option>
                    <option value="SABADO">SÁBADO (Jornada Sabatina)</option>
                  </select>
                </div>

                {/* Tipo / Calendario */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1.5">
                    4. Calendario / Tipo *
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTipo('REGULAR')}
                      className={`py-2 text-xs font-black uppercase rounded-lg transition-all ${
                        tipo === 'REGULAR' ? 'bg-white text-fsm-blue shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      Regular
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipo('CB')}
                      className={`py-2 text-xs font-black uppercase rounded-lg transition-all ${
                        tipo === 'CB' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      Calendario B (CB)
                    </button>
                  </div>
                </div>
              </div>

              {/* Paralelo (solo si es TAE) */}
              {programaCodigo === 'TAE' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1.5">
                    Paralelo / Letra de Salón
                  </label>
                  <div className="flex gap-2">
                    {['A', 'B', 'C', 'D'].map(letter => (
                      <button
                        type="button"
                        key={letter}
                        onClick={() => setParalelo(letter)}
                        className={`w-10 h-10 rounded-xl text-xs font-black uppercase border transition-all ${
                          paralelo === letter
                            ? 'bg-fsm-blue text-white border-fsm-blue shadow-xs'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nombre Oficial Resultante */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" />
                    Nombre Oficial del Curso
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCustomName) setCustomName(suggestedName);
                      setIsCustomName(!isCustomName);
                    }}
                    className="text-[10px] font-bold text-fsm-blue hover:underline uppercase"
                  >
                    {isCustomName ? 'Usar nombre sugerido' : 'Editar nombre manualmente'}
                  </button>
                </div>

                {isCustomName ? (
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                    className="w-full p-2.5 bg-white border border-fsm-blue rounded-xl text-sm font-black text-fsm-blue uppercase outline-none"
                    placeholder="EJ. I DIURNO C"
                    required
                  />
                ) : (
                  <div className="text-base font-black text-fsm-blue uppercase tracking-wide">
                    {suggestedName}
                  </div>
                )}
              </div>

              {/* 5. Fechas y Calendario de Clases */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Calendar size={13} className="text-fsm-blue" />
                    Período Lectivo y Días de Asistencia
                  </label>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    📅 ~{estimatedSessions} clases lectivas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Fecha Inicio</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
                      required
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Fecha Fin</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-fsm-blue"
                      required
                    />
                  </div>
                </div>

                {/* Selector de Días de la Semana */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block mb-1.5">
                    Días de la semana en que se dicta clase:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map(d => {
                      const isSelected = selectedDays.includes(d.day);
                      return (
                        <button
                          type="button"
                          key={d.day}
                          onClick={() => toggleDay(d.day)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase border transition-all ${
                            isSelected
                              ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {d.short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Total de Clases Personalizado */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                      <Layers size={13} className="text-amber-600" />
                      Total de Clases (Opcional)
                    </label>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                      Sobreescribe el calendario
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={totalClasesCustom}
                    onChange={(e) => setTotalClasesCustom(e.target.value)}
                    placeholder={`Ej. 80  (por defecto: ~${estimatedSessions} del calendario)`}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-amber-500 placeholder:font-normal placeholder:text-gray-400"
                  />
                  <p className="text-[10px] text-amber-600 leading-relaxed">
                    Si lo dejas vacío, el % de asistencia se calcula sobre las clases generadas automáticamente por el calendario ({estimatedSessions} clases). Solo usuarios con permiso podrán modificarlo después.
                  </p>
                </div>
              </div>

              {/* Botón de Enviar */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { resetForm(); onClose(); }}
                  className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !activeName.trim() || selectedDays.length === 0}
                  className="px-6 py-2.5 bg-fsm-blue hover:bg-fsm-red text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Generando Curso y Calendario...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Crear Curso ({activeName})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
