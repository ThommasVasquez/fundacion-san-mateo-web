'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, ArrowRight, CheckCircle2, AlertTriangle, UserX, 
  RotateCcw, ArrowLeftRight, Search, ShieldAlert, Sparkles, Filter, 
  Check, ChevronDown, Users, BookOpen
} from 'lucide-react';
import { getGroupStudentsForPromotion, executeSemesterPromotion, PromotionDecision } from '@/app/actions';
import { getAcademicGroupConfig } from '@/lib/academicCatalog';

interface GroupItem {
  id: string;
  nombre: string;
  jornada: string;
  tipo: string;
}

interface StudentItem {
  id: string;
  nombre: string;
  documento: string | null;
  tarjeta_numero: string | number | null;
  rfid_tag_uid: string | null;
  grado: string;
  activo: boolean;
  presentes: number;
  ausentes: number;
  excusas: number;
  attendancePercentage: number;
}

interface PromotionClientProps {
  groups: GroupItem[];
}

export default function PromotionClient({ groups }: PromotionClientProps) {
  const [selectedProgram, setSelectedProgram] = useState<'ALL' | 'TAE' | 'AIPI' | 'PREESCOLAR'>('TAE');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loadingGroup, setLoadingGroup] = useState<boolean>(false);
  const [groupData, setGroupData] = useState<any>(null);
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [targetGrado, setTargetGrado] = useState<string>('');
  const [isFinalSemester, setIsFinalSemester] = useState<boolean>(false);
  const [allGroups, setAllGroups] = useState<GroupItem[]>(groups);

  const getProgramOfGroup = (g: GroupItem): 'TAE' | 'AIPI' | 'PREESCOLAR' => {
    const cfg = getAcademicGroupConfig(g.nombre);
    if (cfg) return cfg.programCode;
    if (g.nombre.toUpperCase().includes('AIPI')) return 'AIPI';
    if (g.nombre.toUpperCase().includes('PREESCOLAR')) return 'PREESCOLAR';
    return 'TAE';
  };

  const filteredSourceGroups = groups.filter(g => {
    if (selectedProgram === 'ALL') return true;
    return getProgramOfGroup(g) === selectedProgram;
  });

  // Auto-select initial group when program changes or on mount
  useEffect(() => {
    if (filteredSourceGroups.length > 0) {
      const stillValid = filteredSourceGroups.some(g => g.id === selectedGroupId);
      if (!stillValid) {
        setSelectedGroupId(filteredSourceGroups[0].id);
      }
    }
  }, [selectedProgram, groups]);
  
  // Decisions map: studentId -> decision
  const [decisions, setDecisions] = useState<Record<string, PromotionDecision>>({});
  const [search, setSearch] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('all');

  // Modal confirmation
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // Load group details when selectedGroupId changes
  useEffect(() => {
    if (!selectedGroupId) return;
    setLoadingGroup(true);
    setStatusMsg({ text: '', type: '' });

    getGroupStudentsForPromotion(selectedGroupId)
      .then(res => {
        if (res.success) {
          setGroupData(res);
          if (res.allGroups) setAllGroups(res.allGroups);
          setIsFinalSemester(res.isFinalSemester || false);

          // Default target group
          if (res.isFinalSemester) {
            setTargetGroupId('');
            setTargetGrado('EGRESADO');
          } else if (res.suggestedTargetGroup) {
            setTargetGroupId(res.suggestedTargetGroup.id);
            setTargetGrado(res.suggestedTargetGroup.nombre);
          } else {
            setTargetGroupId('');
            setTargetGrado('');
          }

          // Initial decisions: promote all active students by default
          const initialDecisions: Record<string, PromotionDecision> = {};
          res.students.forEach((s: StudentItem) => {
            initialDecisions[s.id] = {
              studentId: s.id,
              action: 'promote',
              customTargetGroupId: undefined,
              customTargetGrado: undefined
            };
          });
          setDecisions(initialDecisions);
        } else {
          setStatusMsg({ text: res.error || 'Error al cargar grupo', type: 'error' });
        }
      })
      .catch(err => {
        console.error(err);
        setStatusMsg({ text: 'Error de comunicación al cargar el grupo', type: 'error' });
      })
      .finally(() => {
        setLoadingGroup(false);
      });
  }, [selectedGroupId]);

  const handleActionChange = (studentId: string, action: 'promote' | 'repeat' | 'withdraw' | 'transfer', customGroupId?: string, customGrado?: string) => {
    setDecisions(prev => ({
      ...prev,
      [studentId]: {
        studentId,
        action,
        customTargetGroupId: customGroupId !== undefined ? customGroupId : prev[studentId]?.customTargetGroupId,
        customTargetGrado: customGrado !== undefined ? customGrado : prev[studentId]?.customTargetGrado
      }
    }));
  };

  const togglePromoteStudent = (studentId: string) => {
    setDecisions(prev => {
      const currentAction = prev[studentId]?.action || 'promote';
      const nextAction = currentAction === 'promote' ? 'repeat' : 'promote';
      return {
        ...prev,
        [studentId]: {
          studentId,
          action: nextAction,
          customTargetGroupId: undefined,
          customTargetGrado: undefined
        }
      };
    });
  };

  const handleSetAllPromote = (shouldPromote: boolean) => {
    setDecisions(prev => {
      const next = { ...prev };
      (groupData?.students || []).forEach((s: StudentItem) => {
        next[s.id] = {
          studentId: s.id,
          action: shouldPromote ? 'promote' : 'repeat',
          customTargetGroupId: undefined,
          customTargetGrado: undefined
        };
      });
      return next;
    });
  };

  const handleConfirmPromotion = () => {
    if (!selectedGroupId) return;
    const decisionsArray = Object.values(decisions);
    if (decisionsArray.length === 0) return;

    startTransition(async () => {
      try {
        const res = await executeSemesterPromotion(
          selectedGroupId,
          targetGroupId || null,
          targetGrado || (isFinalSemester ? 'EGRESADO' : null),
          decisionsArray
        );

        if (res.success) {
          setIsModalOpen(false);
          setStatusMsg({
            text: `✓ Cierre y promoción ejecutados con éxito: ${res.summary.promoted} promovidos, ${res.summary.repeated} repiten, ${res.summary.withdrawn} retirados.`,
            type: 'success'
          });
          // Recargar grupo
          const refreshRes = await getGroupStudentsForPromotion(selectedGroupId);
          if (refreshRes.success) {
            setGroupData(refreshRes);
          }
        } else {
          setStatusMsg({ text: res.error || 'Error al procesar la promoción', type: 'error' });
        }
      } catch (err: any) {
        console.error(err);
        setStatusMsg({ text: 'Ocurrió un error inesperado al procesar.', type: 'error' });
      }
    });
  };

  const students: StudentItem[] = groupData?.students || [];

  // Filter students by search and action
  const filteredStudents = students.filter(s => {
    const matchesSearch = !search || 
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (s.documento && s.documento.includes(search)) ||
      (s.tarjeta_numero && String(s.tarjeta_numero).includes(search)) ||
      (s.rfid_tag_uid && s.rfid_tag_uid.toLowerCase().includes(search.toLowerCase()));
    
    const decision = decisions[s.id]?.action || 'promote';
    const matchesAction = filterAction === 'all' || decision === filterAction;

    return matchesSearch && matchesAction;
  });

  // Summary counts
  const promoteCount = Object.values(decisions).filter(d => d.action === 'promote').length;
  const repeatCount = Object.values(decisions).filter(d => d.action === 'repeat').length;
  const withdrawCount = Object.values(decisions).filter(d => d.action === 'withdraw').length;
  const transferCount = Object.values(decisions).filter(d => d.action === 'transfer').length;
  const allArePromoted = students.length > 0 && students.every(s => (decisions[s.id]?.action || 'promote') === 'promote');

  const renderGroupOptions = (list: GroupItem[], filterByProgram?: 'ALL' | 'TAE' | 'AIPI' | 'PREESCOLAR') => {
    const activeFilter = filterByProgram || selectedProgram;

    if (activeFilter === 'TAE') {
      const taeDiurno = list.filter(g => getProgramOfGroup(g) === 'TAE' && (g.jornada === 'DIURNO' || g.nombre.includes('DIURNO')));
      const taeNoche = list.filter(g => getProgramOfGroup(g) === 'TAE' && (g.jornada === 'NOCHE' || g.nombre.includes('NOCHE')));
      const taeSabado = list.filter(g => getProgramOfGroup(g) === 'TAE' && (g.jornada === 'SABADO' || g.nombre.includes('SABADO')));

      return (
        <>
          <optgroup label="☀️ Enfermería TAE - Jornada Diurna">
            {taeDiurno.map(g => (
              <option key={g.id} value={g.id}>
                {g.nombre} {g.tipo === 'CB' ? '(Calendario B)' : ''}
              </option>
            ))}
          </optgroup>
          <optgroup label="🌙 Enfermería TAE - Jornada Nocturna">
            {taeNoche.map(g => (
              <option key={g.id} value={g.id}>
                {g.nombre} {g.tipo === 'CB' ? '(Calendario B)' : ''}
              </option>
            ))}
          </optgroup>
          <optgroup label="📅 Enfermería TAE - Jornada Sabatina">
            {taeSabado.map(g => (
              <option key={g.id} value={g.id}>
                {g.nombre} {g.tipo === 'CB' ? '(Calendario B)' : ''}
              </option>
            ))}
          </optgroup>
        </>
      );
    }

    if (activeFilter === 'AIPI') {
      const aipi = list.filter(g => getProgramOfGroup(g) === 'AIPI');
      return (
        <optgroup label="👶 Primera Infancia (AIPI)">
          {aipi.map(g => (
            <option key={g.id} value={g.id}>
              {g.nombre} (Diurno)
            </option>
          ))}
        </optgroup>
      );
    }

    if (activeFilter === 'PREESCOLAR') {
      const preescolar = list.filter(g => getProgramOfGroup(g) === 'PREESCOLAR');
      return (
        <optgroup label="🎒 Técnico Auxiliar en Preescolar">
          {preescolar.map(g => (
            <option key={g.id} value={g.id}>
              {g.nombre} (Diurno)
            </option>
          ))}
        </optgroup>
      );
    }

    // ALL
    const tae = list.filter(g => getProgramOfGroup(g) === 'TAE');
    const aipi = list.filter(g => getProgramOfGroup(g) === 'AIPI');
    const preescolar = list.filter(g => getProgramOfGroup(g) === 'PREESCOLAR');

    return (
      <>
        <optgroup label="🩺 Técnico Auxiliar en Enfermería (TAE)">
          {tae.map(g => (
            <option key={g.id} value={g.id}>
              {g.nombre} ({g.jornada} {g.tipo === 'CB' ? '• Calendario B' : ''})
            </option>
          ))}
        </optgroup>
        <optgroup label="👶 Primera Infancia (AIPI)">
          {aipi.map(g => (
            <option key={g.id} value={g.id}>
              {g.nombre} (Diurno)
            </option>
          ))}
        </optgroup>
        <optgroup label="🎒 Técnico Auxiliar en Preescolar">
          {preescolar.map(g => (
            <option key={g.id} value={g.id}>
              {g.nombre} (Diurno)
            </option>
          ))}
        </optgroup>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {statusMsg.text && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-bold shadow-xs transition-all ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="shrink-0 text-emerald-600" size={20} /> : <AlertTriangle className="shrink-0 text-rose-600" size={20} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Top Configuration Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Step 1: Select Academic Program Tabs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black tracking-wider uppercase text-gray-700 flex items-center gap-1.5">
              <Filter size={15} className="text-fsm-blue" />
              1. Selecciona el Programa Académico
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Filtra automáticamente los grupos de ese programa
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setSelectedProgram('TAE')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedProgram === 'TAE'
                  ? 'bg-fsm-blue text-white shadow-md shadow-fsm-blue/20 scale-[1.01]'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/70'
              }`}
            >
              <span>🩺 Enfermería TAE</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedProgram === 'TAE' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {groups.filter(g => getProgramOfGroup(g) === 'TAE').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProgram('AIPI')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedProgram === 'AIPI'
                  ? 'bg-fsm-blue text-white shadow-md shadow-fsm-blue/20 scale-[1.01]'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/70'
              }`}
            >
              <span>👶 Primera Infancia</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedProgram === 'AIPI' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {groups.filter(g => getProgramOfGroup(g) === 'AIPI').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProgram('PREESCOLAR')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedProgram === 'PREESCOLAR'
                  ? 'bg-fsm-blue text-white shadow-md shadow-fsm-blue/20 scale-[1.01]'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/70'
              }`}
            >
              <span>🎒 Preescolar</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedProgram === 'PREESCOLAR' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {groups.filter(g => getProgramOfGroup(g) === 'PREESCOLAR').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProgram('ALL')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedProgram === 'ALL'
                  ? 'bg-gray-900 text-white shadow-md scale-[1.01]'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/70'
              }`}
            >
              <span>🌐 Todos ({groups.length})</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2 border-t border-gray-100">
          {/* Source Group Selector */}
          <div>
            <label className="block text-xs font-black tracking-wider uppercase text-gray-800 mb-2">
              2. Selecciona el Grupo a Cerrar / Promover
            </label>
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-fsm-blue focus:outline-none focus:ring-2 focus:ring-fsm-blue/20"
            >
              {renderGroupOptions(groups, selectedProgram)}
            </select>
          </div>

          {/* Destination / Successor Group Selector */}
          <div>
            <label className="block text-xs font-black tracking-wider uppercase text-gray-800 mb-2 flex items-center justify-between">
              <span>3. Grupo Destino para Promovidos</span>
              {isFinalSemester && (
                <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-black">
                  Último Semestre (Graduación)
                </span>
              )}
            </label>
            {isFinalSemester ? (
              <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded-xl px-4 py-3 text-sm font-black flex items-center justify-between">
                <span>🎓 EGRESADO / GRADUADO (Finalizan Ciclo)</span>
                <span className="text-xs font-normal text-purple-700">Se inactivan accesos diarios</span>
              </div>
            ) : (
              <select
                value={targetGroupId}
                onChange={e => {
                  const val = e.target.value;
                  setTargetGroupId(val);
                  const found = allGroups.find(g => g.id === val);
                  if (found) setTargetGrado(found.nombre);
                }}
                className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-4 py-3 text-sm font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Seleccionar grupo siguiente --</option>
                {renderGroupOptions(allGroups, 'ALL')}
              </select>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-950">
          <BookOpen className="shrink-0 text-fsm-blue mt-0.5" size={18} />
          <div>
            <p className="font-bold">¿Cómo funciona este proceso?</p>
            <p className="mt-0.5 text-blue-900">
              Al ejecutar la promoción, los estudiantes con acción <strong>Promover</strong> se matricularán automáticamente en el nuevo grupo manteniendo su tarjeta RFID. Los que <strong>Repiten</strong> se mantendrán en el mismo grado para el nuevo ciclo, y los <strong>Retirados</strong> quedarán inactivos y el torniquete les negará el acceso físico. El historial previo queda 100% conservado.
            </p>
          </div>
        </div>
      </div>

      {/* Main Student Table & Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Buscar por nombre, documento o tarjeta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-fsm-blue/20"
              />
            </div>

            {/* Filter by Action */}
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none"
            >
              <option value="all">Todas las decisiones</option>
              <option value="promote">Solo Promovidos</option>
              <option value="repeat">Solo Repitencias</option>
              <option value="withdraw">Solo Retirados</option>
              <option value="transfer">Solo Traslados</option>
            </select>

            {/* Live Counter Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${
                promoteCount > 0 
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300 shadow-2xs' 
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                <CheckCircle2 size={14} className={promoteCount > 0 ? 'text-emerald-700' : 'text-gray-400'} />
                <span>{promoteCount} de {students.length} para Promover</span>
              </span>
              {repeatCount > 0 && (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                  <RotateCcw size={13} className="text-amber-700" />
                  <span>{repeatCount} Repiten</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Bulk Select Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetAllPromote(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Marcar todos los estudiantes para promover"
            >
              <CheckCircle2 size={13} /> Promover Todos ({students.length})
            </button>
            <button
              type="button"
              onClick={() => handleSetAllPromote(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Desmarcar todos para seleccionar solo los que pasan manualmente"
            >
              <UserX size={13} /> Desmarcar Todos (0)
            </button>
          </div>
        </div>

        {/* Student List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/70 text-[11px] font-black tracking-wider uppercase text-gray-700">
                <th className="p-3 w-28 text-center border-r border-gray-200 bg-gray-50/80">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black uppercase text-fsm-blue">¿Promover?</span>
                    <input
                      type="checkbox"
                      checked={allArePromoted}
                      onChange={e => handleSetAllPromote(e.target.checked)}
                      title={allArePromoted ? 'Desmarcar todos (nadie promovido)' : 'Marcar todos para promover'}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="p-3.5">Estudiante</th>
                <th className="p-3.5">Identificación / Tarjeta</th>
                <th className="p-3.5">Asistencia Semestral</th>
                <th className="p-3.5 min-w-[240px]">Acción Individual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loadingGroup ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500 font-bold">
                    Cargando estudiantes del grupo...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500 font-bold">
                    No se encontraron estudiantes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const decision = decisions[s.id] || { studentId: s.id, action: 'promote' };
                  const isPromoted = decision.action === 'promote';
                  const pct = s.attendancePercentage;

                  return (
                    <tr 
                      key={s.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        decision.action === 'withdraw' 
                          ? 'bg-rose-50/40 text-gray-500' 
                          : decision.action === 'repeat' 
                          ? 'bg-amber-50/40' 
                          : decision.action === 'transfer'
                          ? 'bg-indigo-50/40'
                          : ''
                      }`}
                    >
                      {/* Promover Checkbox */}
                      <td className="p-3.5 text-center border-r border-gray-100">
                        <label className="flex flex-col items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isPromoted}
                            onChange={() => togglePromoteStudent(s.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            decision.action === 'promote' 
                              ? 'text-emerald-800 bg-emerald-100' 
                              : decision.action === 'repeat'
                              ? 'text-amber-800 bg-amber-100'
                              : 'text-rose-800 bg-rose-100'
                          }`}>
                            {decision.action === 'promote' ? (isFinalSemester ? 'Egresa' : 'Promover') : decision.action === 'repeat' ? 'Repite' : decision.action}
                          </span>
                        </label>
                      </td>

                      {/* Student Info */}
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 text-[13px] flex items-center gap-2">
                          <span>{s.nombre}</span>
                          {!s.activo && (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-600 font-medium">
                          Grado actual: <span className="font-bold text-gray-800">{s.grado}</span>
                        </div>
                      </td>

                      {/* Document & RFID / Tarjeta */}
                      <td className="p-3.5">
                        <div className="font-mono text-gray-700 text-[11px]">
                          Doc: {s.documento || 'Sin doc'}
                        </div>
                        <div className="text-[10px] text-gray-600 flex items-center gap-1.5 mt-1">
                          {s.tarjeta_numero || s.rfid_tag_uid ? (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                              💳 Tarjeta: {s.tarjeta_numero ? `#${s.tarjeta_numero}` : s.rfid_tag_uid}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold">Sin tarjeta</span>
                          )}
                        </div>
                      </td>

                      {/* Attendance Stats */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                pct >= 80 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`font-black text-xs ${
                            pct >= 80 ? 'text-emerald-700' : pct >= 70 ? 'text-amber-700' : 'text-rose-700'
                          }`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1 flex items-center gap-2">
                          <span className="text-emerald-700 font-bold">{s.presentes} asistencias</span>
                          <span>•</span>
                          <span className="text-rose-700 font-bold">{s.ausentes} fallas</span>
                        </div>
                      </td>

                      {/* Action Selector */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleActionChange(s.id, 'promote')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                              decision.action === 'promote'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <CheckCircle2 size={12} /> {isFinalSemester ? 'Egresar' : 'Promover'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleActionChange(s.id, 'repeat')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                              decision.action === 'repeat'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <RotateCcw size={12} /> Repite
                          </button>

                          <button
                            type="button"
                            onClick={() => handleActionChange(s.id, 'withdraw')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                              decision.action === 'withdraw'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <UserX size={12} /> Retirado
                          </button>

                          <button
                            type="button"
                            onClick={() => handleActionChange(s.id, 'transfer')}
                            className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                              decision.action === 'transfer'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title="Trasladar a otro curso/jornada"
                          >
                            <ArrowLeftRight size={12} />
                          </button>
                        </div>

                        {/* If transfer, show target group selector */}
                        {decision.action === 'transfer' && (
                          <div className="mt-2">
                            <select
                              value={decision.customTargetGroupId || ''}
                              onChange={e => {
                                const gId = e.target.value;
                                const gr = allGroups.find(g => g.id === gId);
                                handleActionChange(s.id, 'transfer', gId, gr?.nombre);
                              }}
                              className="w-full bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg p-1.5 text-[11px] font-bold"
                            >
                              <option value="">Seleccionar curso destino...</option>
                              {renderGroupOptions(allGroups)}
                            </select>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar & Submit Button */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <span className="text-gray-600">Balance del Cierre:</span>
            <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <CheckCircle2 size={14} /> {promoteCount} Promovidos
            </span>
            <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <RotateCcw size={14} /> {repeatCount} Repiten
            </span>
            <span className="bg-rose-100 text-rose-900 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <UserX size={14} /> {withdrawCount} Retirados
            </span>
            {transferCount > 0 && (
              <span className="bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <ArrowLeftRight size={14} /> {transferCount} Traslados
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={students.length === 0 || isPending}
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider bg-fsm-blue text-white hover:bg-emerald-600 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <GraduationCap size={18} />
            <span>Ejecutar Promoción ({promoteCount} a promover, {repeatCount} repiten)</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-fsm-blue">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-fsm-blue">
                <GraduationCap size={26} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Confirmar Cierre de Semestre</h3>
                <p className="text-xs text-gray-500 font-medium">Grupo: {groupData?.group?.nombre}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200 font-bold">
                <span className="text-gray-600">Total Estudiantes en el Grupo:</span>
                <span className="text-gray-900">{students.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 font-bold text-emerald-800">
                <span>Promovidos a {targetGrado || 'Siguiente Semestre'}:</span>
                <span className="text-sm font-black">{promoteCount} estudiante{promoteCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 font-bold text-amber-800">
                <span>Repiten curso en {groupData?.group?.nombre}:</span>
                <span className="text-sm font-black">{repeatCount} estudiante{repeatCount !== 1 ? 's' : ''}</span>
              </div>
              {withdrawCount > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-200 font-bold text-rose-800">
                  <span>Retirados (Acceso torniquete bloqueado):</span>
                  <span className="text-sm font-black">{withdrawCount}</span>
                </div>
              )}
              {transferCount > 0 && (
                <div className="flex justify-between py-1 font-bold text-indigo-800">
                  <span>Traslados a otros cursos:</span>
                  <span className="text-sm font-black">{transferCount}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
              <ShieldAlert className="shrink-0 text-amber-600 mt-0.5" size={16} />
              <span>
                Esta acción cerrará las matrículas anteriores preservando el historial completo de asistencia y abrirá las nuevas matrículas para el siguiente periodo.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmPromotion}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-fsm-blue text-white hover:bg-emerald-600 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Procesando Cierre...' : 'Sí, Procesar Ahora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
