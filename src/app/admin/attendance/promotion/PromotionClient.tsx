'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, ArrowRight, CheckCircle2, AlertTriangle, UserX, 
  RotateCcw, ArrowLeftRight, Search, ShieldAlert, Sparkles, Filter, 
  Check, ChevronDown, Users, BookOpen
} from 'lucide-react';
import { getGroupStudentsForPromotion, executeSemesterPromotion, PromotionDecision } from '@/app/actions';

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
  tarjeta_numero: string | null;
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
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');
  const [loadingGroup, setLoadingGroup] = useState<boolean>(false);
  const [groupData, setGroupData] = useState<any>(null);
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [targetGrado, setTargetGrado] = useState<string>('');
  const [isFinalSemester, setIsFinalSemester] = useState<boolean>(false);
  const [allGroups, setAllGroups] = useState<GroupItem[]>(groups);
  
  // Decisions map: studentId -> decision
  const [decisions, setDecisions] = useState<Record<string, PromotionDecision>>({});
  const [search, setSearch] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Modal confirmation
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // Load group details when selectedGroupId changes
  useEffect(() => {
    if (!selectedGroupId) return;
    setLoadingGroup(true);
    setStatusMsg({ text: '', type: '' });
    setSelectedStudentIds(new Set());

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

  const handleBulkAction = (action: 'promote' | 'repeat' | 'withdraw') => {
    const targetIds = selectedStudentIds.size > 0 
      ? Array.from(selectedStudentIds) 
      : (groupData?.students || []).map((s: StudentItem) => s.id);

    setDecisions(prev => {
      const next = { ...prev };
      targetIds.forEach((id: string) => {
        next[id] = {
          studentId: id,
          action,
          customTargetGroupId: undefined,
          customTargetGrado: undefined
        };
      });
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!groupData?.students) return;
    if (selectedStudentIds.size === groupData.students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(groupData.students.map((s: StudentItem) => s.id)));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const renderGroupOptions = (list: GroupItem[]) => {
    const tae = list.filter(g => g.nombre.includes('DIURNO') || g.nombre.includes('NOCHE') || g.nombre.includes('SABADO'));
    const aipi = list.filter(g => g.nombre.includes('AIPI'));
    const preescolar = list.filter(g => g.nombre.includes('PREESCOLAR'));

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Source Group Selector */}
          <div>
            <label className="block text-xs font-black tracking-wider uppercase text-gray-800 mb-2">
              1. Selecciona el Grupo a Cerrar / Promover
            </label>
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-fsm-blue focus:outline-none focus:ring-2 focus:ring-fsm-blue/20"
            >
              {renderGroupOptions(groups)}
            </select>
          </div>

          {/* Destination / Successor Group Selector */}
          <div>
            <label className="block text-xs font-black tracking-wider uppercase text-gray-800 mb-2 flex items-center justify-between">
              <span>2. Grupo Destino para Promovidos</span>
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
                {renderGroupOptions(allGroups)}
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
          </div>

          {/* Quick Bulk Actions */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-700 tracking-wider">
              {selectedStudentIds.size > 0 ? `Para ${selectedStudentIds.size} seleccionados:` : 'Para todo el grupo:'}
            </span>
            <button
              onClick={() => handleBulkAction('promote')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <CheckCircle2 size={13} /> Promover
            </button>
            <button
              onClick={() => handleBulkAction('repeat')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <RotateCcw size={13} /> Repetir
            </button>
            <button
              onClick={() => handleBulkAction('withdraw')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <UserX size={13} /> Retirar
            </button>
          </div>
        </div>

        {/* Student List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/70 text-[11px] font-black tracking-wider uppercase text-gray-700">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selectedStudentIds.size === students.length}
                    onChange={toggleSelectAll}
                    className="rounded text-fsm-blue focus:ring-fsm-blue cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Estudiante</th>
                <th className="p-3.5">Identificación / Tarjeta</th>
                <th className="p-3.5">Asistencia Semestral</th>
                <th className="p-3.5 min-w-[240px]">Decisión para Siguiente Periodo</th>
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
                  const isSelected = selectedStudentIds.has(s.id);
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
                      {/* Select Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(s.id)}
                          className="rounded text-fsm-blue focus:ring-fsm-blue cursor-pointer"
                        />
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

                      {/* Document & RFID */}
                      <td className="p-3.5">
                        <div className="font-mono text-gray-700 text-[11px]">
                          Doc: {s.documento || 'Sin doc'}
                        </div>
                        <div className="text-[10px] text-gray-600 flex items-center gap-1.5 mt-0.5">
                          {s.rfid_tag_uid ? (
                            <span className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-mono font-bold">
                              RFID: {s.rfid_tag_uid}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium">Sin tarjeta</span>
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
            className="px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider bg-fsm-blue text-white hover:bg-fsm-red transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <GraduationCap size={18} />
            <span>Ejecutar Cierre y Promoción</span>
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
                <span className="text-gray-600">Total Estudiantes:</span>
                <span className="text-gray-900">{students.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 font-bold text-emerald-800">
                <span>Promovidos a {targetGrado || 'Siguiente Semestre'}:</span>
                <span>{promoteCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 font-bold text-amber-800">
                <span>Repiten en {groupData?.group?.nombre}:</span>
                <span>{repeatCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 font-bold text-rose-800">
                <span>Retirados (Acceso torniquete bloqueado):</span>
                <span>{withdrawCount}</span>
              </div>
              {transferCount > 0 && (
                <div className="flex justify-between py-1 font-bold text-indigo-800">
                  <span>Traslados a otros cursos:</span>
                  <span>{transferCount}</span>
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
