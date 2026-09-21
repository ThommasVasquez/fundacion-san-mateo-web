'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Users, Trash2, Edit3, CheckCircle2, AlertTriangle, 
  Search, Clock, Plus, ArrowRight, ShieldCheck, X, Sparkles, RefreshCw,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  removeStudentEnrollment, 
  updateStudentEnrollment, 
  keepSingleEnrollment, 
  addStudentEnrollment 
} from '@/app/actions';
import { OFFICIAL_GROUPS } from '@/lib/academicCatalog';

export interface StudentEnrollmentItem {
  enrollment_id: string;
  group_id: string;
  group_name: string;
  jornada: string;
  tipo?: string;
  programa_nombre?: string;
}

export interface MultiEnrolledStudent {
  student_id: string;
  student_name: string;
  documento?: string | null;
  student_grado?: string | null;
  enrollments: StudentEnrollmentItem[];
}

export interface GroupOption {
  id: string;
  nombre: string;
  jornada: string;
  tipo?: string;
  programa_nombre?: string;
}

interface MultiEnrollmentManagerProps {
  initialStudents: MultiEnrolledStudent[];
  allGroups: GroupOption[];
}

export default function MultiEnrollmentManager({ initialStudents, allGroups }: MultiEnrollmentManagerProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(3);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal para Editar Curso / Horario
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    student: MultiEnrolledStudent | null;
    enrollment: StudentEnrollmentItem | null;
    selectedGroupId: string;
  }>({
    isOpen: false,
    student: null,
    enrollment: null,
    selectedGroupId: '',
  });

  // Modal para Agregar Curso Adicional
  const [addModal, setAddModal] = useState<{
    isOpen: boolean;
    student: MultiEnrolledStudent | null;
    selectedGroupId: string;
  }>({
    isOpen: false,
    student: null,
    selectedGroupId: '',
  });

  // Modal de Confirmación Institucional FSM
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    message: string;
    confirmText: string;
    confirmClass?: string;
    badgeText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    onConfirm: () => {},
  });

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const setStudentLoading = (id: string, isLoading: boolean) => {
    setLoadingMap(prev => ({ ...prev, [id]: isLoading }));
  };

  // 1. Eliminar una matrícula específica de un curso/horario
  const handleRemoveEnrollment = (student: MultiEnrolledStudent, enrollment: StudentEnrollmentItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'ELIMINAR CURSO / HORARIO',
      subtitle: `${student.student_name} • ${enrollment.group_name}`,
      message: `¿Estás seguro de que deseas retirar a ${student.student_name} del curso ${enrollment.group_name} (${enrollment.jornada})? El estudiante dejará de figurar en la planilla de este grupo.`,
      confirmText: 'Sí, Eliminar Curso',
      confirmClass: 'bg-fsm-red hover:bg-red-700 text-white',
      badgeText: 'RETIRO DE GRUPO',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setStudentLoading(student.student_id, true);
        const res = await removeStudentEnrollment(student.student_id, enrollment.enrollment_id);
        setStudentLoading(student.student_id, false);

        if (res.success) {
          showStatus(`✓ ${student.student_name} fue retirado de ${enrollment.group_name}.`);
          router.refresh();
        } else {
          showStatus(res.error || 'Error al retirar estudiante del curso', 'error');
        }
      }
    });
  };

  // 2. Dejar como único curso oficial (quitar los demás con 1 clic)
  const handleKeepSingle = (student: MultiEnrolledStudent, enrollment: StudentEnrollmentItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'UNIFICAR EN ESTE CURSO ÚNICO',
      subtitle: `${student.student_name} ➔ ${enrollment.group_name}`,
      message: `¿Deseas dejar a ${student.student_name} ÚNICAMENTE en el curso ${enrollment.group_name} (${enrollment.jornada})? Se eliminarán automáticamente las demás matrículas en conflicto y se actualizará su expediente oficial.`,
      confirmText: 'Sí, Establecer como Curso Único',
      confirmClass: 'bg-purple-700 hover:bg-purple-800 text-white',
      badgeText: 'RESOLUCIÓN DE CONFLICTO',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setStudentLoading(student.student_id, true);
        const res = await keepSingleEnrollment(student.student_id, enrollment.enrollment_id);
        setStudentLoading(student.student_id, false);

        if (res.success) {
          showStatus(`✓ Matrícula de ${student.student_name} unificada en ${enrollment.group_name}.`);
          router.refresh();
        } else {
          showStatus(res.error || 'Error al unificar matrícula', 'error');
        }
      }
    });
  };

  // 3. Abrir modal para editar el curso / horario
  const openEditModal = (student: MultiEnrolledStudent, enrollment: StudentEnrollmentItem) => {
    setEditModal({
      isOpen: true,
      student,
      enrollment,
      selectedGroupId: enrollment.group_id,
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal.student || !editModal.enrollment || !editModal.selectedGroupId) return;

    setStudentLoading(editModal.student.student_id, true);
    const res = await updateStudentEnrollment(
      editModal.student.student_id,
      editModal.enrollment.enrollment_id,
      editModal.selectedGroupId
    );
    setStudentLoading(editModal.student.student_id, false);

    if (res.success) {
      showStatus(`✓ Curso/Horario actualizado a ${res.newGroupName} para ${editModal.student.student_name}.`);
      setEditModal(prev => ({ ...prev, isOpen: false }));
      router.refresh();
    } else {
      showStatus(res.error || 'Error al actualizar curso/horario', 'error');
    }
  };

  // 4. Abrir modal para agregar un curso adicional
  const openAddModal = (student: MultiEnrolledStudent) => {
    setAddModal({
      isOpen: true,
      student,
      selectedGroupId: allGroups[0]?.id || '',
    });
  };

  const handleSaveAdd = async () => {
    if (!addModal.student || !addModal.selectedGroupId) return;

    setStudentLoading(addModal.student.student_id, true);
    const res = await addStudentEnrollment(addModal.student.student_id, addModal.selectedGroupId);
    setStudentLoading(addModal.student.student_id, false);

    if (res.success) {
      showStatus(`✓ ${addModal.student.student_name} fue inscrito adicionalmente en ${res.groupName}.`);
      setAddModal(prev => ({ ...prev, isOpen: false }));
      router.refresh();
    } else {
      showStatus(res.error || 'Error al agregar curso', 'error');
    }
  };

  // Filtrado en vivo
  const filteredStudents = initialStudents.filter(s => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      s.student_name.toLowerCase().includes(term) ||
      (s.documento && s.documento.toLowerCase().includes(term)) ||
      (s.student_grado && s.student_grado.toLowerCase().includes(term)) ||
      s.enrollments.some(e => e.group_name.toLowerCase().includes(term) || e.jornada.toLowerCase().includes(term))
    );
  });

  // Resetear a página 1 cuando cambia la búsqueda o el tamaño de página
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  // Cálculos de Paginación (por defecto 5 entradas)
  const totalEntries = filteredStudents.length;
  const effectivePageSize = pageSize > 0 ? pageSize : totalEntries;
  const totalPages = Math.max(1, Math.ceil(totalEntries / (effectivePageSize || 1)));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, totalEntries);
  const paginatedStudents = effectivePageSize === totalEntries 
    ? filteredStudents 
    : filteredStudents.slice(startIndex, endIndex);

  const getShiftBadge = (jornada: string, groupName: string) => {
    const isCB = groupName.toUpperCase().includes('CB');
    const cleanJornada = jornada ? jornada.toUpperCase() : '';

    if (cleanJornada.includes('SAB') || groupName.toUpperCase().includes('SABADO')) {
      return {
        label: `☀️ SÁBADO (7:00 am - 5:00 pm)${isCB ? ' • CALENDARIO B' : ''}`,
        bg: 'bg-amber-50 text-amber-900 border-amber-200',
        icon: '☀️'
      };
    }
    if (cleanJornada.includes('NOCH') || groupName.toUpperCase().includes('NOCHE')) {
      return {
        label: `🌙 NOCHE (6:00 pm - 9:30 pm)${isCB ? ' • CALENDARIO B' : ''}`,
        bg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
        icon: '🌙'
      };
    }
    return {
      label: `🌅 DIURNO (7:00 am - 12:00 pm)${isCB ? ' • CALENDARIO B' : ''}`,
      bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      icon: '🌅'
    };
  };

  return (
    <div className="space-y-6">
      {/* Banner de Estado */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl border font-bold text-xs uppercase tracking-wider flex items-center justify-between animate-in fade-in duration-200 ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-fsm-red border-red-200'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Búsqueda, Selector de Entradas y Conteo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar por estudiante, documento o curso en conflicto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-8 py-2 border border-gray-200 rounded-xl font-medium text-xs bg-white outline-none focus:border-purple-600 shadow-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Entradas por Página (De a 3 por defecto) */}
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <span className="text-gray-500 font-medium">Mostrar:</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="bg-transparent font-black text-xs text-purple-900 outline-none cursor-pointer"
            >
              <option value={3}>3 entradas por página</option>
              <option value={6}>6 entradas por página</option>
              <option value={9}>9 entradas por página</option>
              <option value={15}>15 entradas por página</option>
              <option value={0}>Todas las entradas ({totalEntries})</option>
            </select>
          </div>

          {/* Resumen de Conteo */}
          <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-900 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">
            <Users size={15} className="text-purple-700" />
            <span>
              {totalEntries === 0 ? '0' : `${startIndex + 1}–${endIndex}`} de {totalEntries} estudiantes
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Estudiantes Multimatriculados (Paginado de a 5 entradas) */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <ShieldCheck size={40} className="mx-auto text-emerald-500" />
          <h3 className="text-base font-black text-gray-800 uppercase">No hay alumnos en conflicto</h3>
          <p className="text-xs text-gray-500 font-medium">
            {searchTerm ? 'Ningún estudiante coincide con el término de búsqueda.' : 'Todos los estudiantes de la institución cuentan con un curso y horario único y coherente.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedStudents.map(student => {
            const isLoading = Boolean(loadingMap[student.student_id]);

            return (
              <div 
                key={student.student_id} 
                className={`bg-white rounded-3xl border border-purple-100/80 shadow-sm p-6 space-y-4 hover:shadow-md transition-all flex flex-col justify-between relative ${
                  isLoading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div>
                  {/* Cabecera del Estudiante */}
                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                        <AlertTriangle size={11} className="text-amber-500" /> {student.enrollments.length} CURSOS ACTIVOS
                      </span>
                      <h3 className="text-sm font-black text-fsm-blue uppercase mt-1 leading-tight">
                        {student.student_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {student.documento && (
                          <span className="text-[10px] font-mono text-gray-600 font-bold">
                            📄 Doc: {student.documento}
                          </span>
                        )}
                        {student.student_grado && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            • Grado base: {student.student_grado}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lista Interactiva de Cursos y Horarios a los que Pertenece */}
                  <div className="space-y-3 mt-4">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                      Cursos y Horarios Asignados:
                    </span>

                    {student.enrollments.map((enr, idx) => {
                      const shift = getShiftBadge(enr.jornada, enr.group_name);

                      return (
                        <div 
                          key={enr.enrollment_id || `${enr.group_id}-${idx}`}
                          className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 transition-colors hover:border-purple-300"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-fsm-blue uppercase">
                                  {enr.group_name}
                                </span>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md border mt-1 inline-flex items-center gap-1 ${shift.bg}`}>
                                <Clock size={10} /> {shift.label}
                              </span>
                            </div>
                          </div>

                          {/* Botones de Acción por Curso: Eliminar, Editar y Dejar Único */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                            {/* 1. Botón Editar Curso / Horario */}
                            <button
                              type="button"
                              onClick={() => openEditModal(student, enr)}
                              className="px-2 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-2xs"
                              title="Cambiar este curso y horario por otro grupo oficial"
                            >
                              <Edit3 size={11} /> Editar
                            </button>

                            {/* 2. Botón Eliminar / Quitar de este curso */}
                            <button
                              type="button"
                              onClick={() => handleRemoveEnrollment(student, enr)}
                              className="px-2 py-1 bg-white hover:bg-red-50 text-fsm-red border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-2xs"
                              title="Quitar al estudiante de este curso y horario"
                            >
                              <Trash2 size={11} /> Quitar
                            </button>

                            {/* 3. Botón Dejar Solo Este Curso */}
                            <button
                              type="button"
                              onClick={() => handleKeepSingle(student, enr)}
                              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm ml-auto"
                              title="Dejar al estudiante únicamente en este curso y retirar los demás"
                            >
                              <CheckCircle2 size={11} /> Dejar Único
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pie de Tarjeta: Agregar curso adicional si se requiere */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400">
                    {student.enrollments.length > 2 ? '⚠️ Multimatrícula crítica' : 'Resolución con 1 clic'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openAddModal(student)}
                    className="text-[10px] font-black uppercase text-fsm-blue hover:text-purple-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> Asignar otro curso
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-purple-100">
          <p className="text-xs font-bold text-gray-500">
            Página <span className="font-black text-purple-900">{validCurrentPage}</span> de{' '}
            <span className="font-black text-purple-900">{totalPages}</span> • Mostrando {startIndex + 1}–{endIndex} de {totalEntries} estudiantes
          </p>

          <div className="flex items-center gap-1.5">
            {/* Botón Anterior */}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-900 hover:border-purple-200 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 shadow-2xs"
            >
              <ChevronLeft size={14} /> Anterior
            </button>

            {/* Números de Página */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;

                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-xs text-gray-400 font-bold">…</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all ${
                          validCurrentPage === p
                            ? 'bg-purple-700 text-white font-black shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-200'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            {/* Botón Siguiente */}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-900 hover:border-purple-200 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 shadow-2xs"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal 1: Editar Curso y Horario */}
      {editModal.isOpen && editModal.student && editModal.enrollment && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-lg p-7 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest">EDICIÓN DE MATRÍCULA</span>
                <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight mt-0.5">
                  CAMBIAR CURSO Y HORARIO
                </h3>
              </div>
              <button 
                onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-medium text-gray-700 space-y-1">
                <p>Estudiante: <strong className="text-fsm-blue font-bold uppercase">{editModal.student.student_name}</strong></p>
                <p>Curso actual a modificar: <strong className="text-purple-700 font-bold">{editModal.enrollment.group_name}</strong> ({editModal.enrollment.jornada})</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">
                  Nuevo Curso Oficial y Horario / Jornada de Destino:
                </label>
                <select
                  value={editModal.selectedGroupId}
                  onChange={e => setEditModal(prev => ({ ...prev, selectedGroupId: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-purple-600 bg-white"
                >
                  <optgroup label="🩺 Técnico Auxiliar en Enfermería (TAE) • Diurno (7:00 am - 12:00 pm)">
                    {allGroups
                      .filter(g => (g.programa_nombre?.includes('Enfermería') || g.nombre.includes('TAE') || (!g.nombre.includes('AIPI') && !g.nombre.includes('PREESCOLAR'))) && (g.jornada === 'DIURNO' || g.nombre.includes('DIURNO')))
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          {g.nombre} (Diurno 7am - 12pm)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🩺 Técnico Auxiliar en Enfermería (TAE) • Nocturno (6:00 pm - 9:30 pm)">
                    {allGroups
                      .filter(g => (g.jornada === 'NOCHE' || g.nombre.includes('NOCHE')))
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          {g.nombre} (Noche 6pm - 9:30pm)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🩺 Técnico Auxiliar en Enfermería (TAE) • Sabatino (7:00 am - 5:00 pm)">
                    {allGroups
                      .filter(g => (g.jornada === 'SABADO' || g.nombre.includes('SABADO')))
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          {g.nombre} (Sábado 7am - 5pm)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="👶 Atención a la Primera Infancia (AIPI) • Diurno">
                    {allGroups
                      .filter(g => g.nombre.includes('AIPI'))
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          {g.nombre} (Diurno 7am - 12pm)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🎒 Técnico Auxiliar en Preescolar • Diurno">
                    {allGroups
                      .filter(g => g.nombre.includes('PREESCOLAR'))
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          {g.nombre} (Diurno 7am - 12pm)
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Al guardar, la matrícula del estudiante se actualizará al nuevo grupo y horario seleccionado, actualizando también su grado en el padrón institucional.
              </p>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100 justify-end">
              <button
                type="button"
                onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-6 py-2.5 bg-purple-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-800 transition-all flex items-center gap-2 shadow-md"
              >
                <CheckCircle2 size={15} /> Guardar Curso y Horario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Agregar Curso / Horario Adicional */}
      {addModal.isOpen && addModal.student && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-lg p-7 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest">ASIGNACIÓN ADICIONAL</span>
                <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight mt-0.5">
                  ASIGNAR OTRO CURSO / HORARIO
                </h3>
              </div>
              <button 
                onClick={() => setAddModal(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-medium text-gray-700">
                Estudiante: <strong className="text-fsm-blue font-bold uppercase">{addModal.student.student_name}</strong>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">
                  Seleccionar Curso y Horario a Agregar:
                </label>
                <select
                  value={addModal.selectedGroupId}
                  onChange={e => setAddModal(prev => ({ ...prev, selectedGroupId: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue bg-white"
                >
                  {allGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.nombre} ({g.jornada})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100 justify-end">
              <button
                type="button"
                onClick={() => setAddModal(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAdd}
                className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 shadow-md"
              >
                <Plus size={15} /> Asignar Curso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Institucional FSM */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-md p-8 text-center space-y-5 animate-in zoom-in-95 duration-200 relative">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-16 h-16 relative bg-fsm-blue/5 rounded-full p-2 border border-fsm-blue/10 flex items-center justify-center shadow-inner">
                <Image src="/FSM.png" alt="Escudo FSM" width={48} height={48} className="object-contain" />
              </div>
              {confirmDialog.badgeText && (
                <span className="text-[9px] font-black text-fsm-blue tracking-widest uppercase bg-fsm-blue/5 border border-fsm-blue/10 px-3 py-1 rounded-full">
                  {confirmDialog.badgeText}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-fsm-blue uppercase tracking-tight leading-tight">
                {confirmDialog.title}
              </h3>
              {confirmDialog.subtitle && (
                <p className="text-xs font-black text-purple-700 uppercase tracking-wider">
                  {confirmDialog.subtitle}
                </p>
              )}
              <p className="text-xs font-semibold text-gray-600 leading-relaxed pt-2">
                {confirmDialog.message}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 ${
                  confirmDialog.confirmClass || 'bg-fsm-blue text-white hover:bg-fsm-red'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
