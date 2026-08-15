"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  setEnrollmentStudent, linkStudentTag, unlinkStudentTag, 
  updateStudentDetails, createStudent, bulkUpdateStudentGrado, deleteStudent, recordManualAttendance 
} from '@/app/actions';
import { 
  Tag, Search, AlertTriangle, ArrowLeft, RefreshCw, 
  Check, X, Link as LinkIcon, AlertCircle, Plus, Edit2, Save, Trash2, Users, Layers, UserCheck
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Student {
  id: string;
  nombre: string;
  grado: string;
  rfid_tag_uid: string | null;
  activo: boolean;
}

interface EnrollmentClientProps {
  students: Student[];
  activeStudentId: string | null;
  pendingUid?: string;
}

export default function EnrollmentClient({ students, activeStudentId, pendingUid = '' }: EnrollmentClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterGrado, setFilterGrado] = useState('');
  const [manualUidMap, setManualUidMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Selection for Bulk Actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [newBulkGrado, setNewBulkGrado] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Modal for Editing Student Details
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editGrado, setEditGrado] = useState('');
  const [editActivo, setEditActivo] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal for Creating New Student
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newGrado, setNewGrado] = useState('');
  const [newUid, setNewUid] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const activeStudent = students.find(s => s.id === activeStudentId);

  useEffect(() => {
    if (!activeStudentId) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 2000);
    return () => clearInterval(interval);
  }, [activeStudentId, router]);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 5000);
  };

  const handleStartEnrollment = async (studentId: string) => {
    setLoading(prev => ({ ...prev, [studentId]: true }));
    const res = await setEnrollmentStudent(studentId);
    setLoading(prev => ({ ...prev, [studentId]: false }));

    if (res.success) {
      showStatus('Modo vinculación activado. Esperando escaneo...', 'success');
      router.refresh();
    } else {
      showStatus(res.error || 'Error al iniciar modo vinculación', 'error');
    }
  };

  const handleCancelEnrollment = async () => {
    const res = await setEnrollmentStudent(null);
    if (res.success) {
      showStatus('Modo vinculación cancelado.', 'success');
      router.refresh();
    } else {
      showStatus(res.error || 'Error al cancelar', 'error');
    }
  };

  // Custom Fundación San Mateo Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    message: string;
    confirmBtnText: string;
    confirmBtnClass?: string;
    badgeText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmBtnText: 'Confirmar',
    onConfirm: () => {},
  });

  const handleUnlink = async (studentId: string, studentName?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'DESVINCULAR TARJETA RFID',
      subtitle: studentName || 'Estudiante',
      message: `¿Estás seguro de que deseas desvincular la tarjeta física del estudiante ${studentName || ''}? El alumno no podrá ingresar por el lector hasta que se le asocie una nueva tarjeta.`,
      confirmBtnText: 'Sí, Desvincular Tarjeta',
      confirmBtnClass: 'bg-fsm-red hover:bg-red-700 text-white',
      badgeText: 'ACCION REVERSIBLE',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(prev => ({ ...prev, [studentId]: true }));
        const res = await unlinkStudentTag(studentId);
        setLoading(prev => ({ ...prev, [studentId]: false }));

        if (res.success) {
          showStatus('Tarjeta desvinculada con éxito.');
          router.refresh();
        } else {
          showStatus(res.error || 'Error al desvincular', 'error');
        }
      }
    });
  };

  const handleManualLink = async (studentId: string, customUid?: string) => {
    const uidToLink = customUid || manualUidMap[studentId]?.trim();
    if (!uidToLink) {
      showStatus('Por favor ingresa un UID válido.', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, [studentId]: true }));
    const res = await linkStudentTag(studentId, uidToLink);
    setLoading(prev => ({ ...prev, [studentId]: false }));

    if (res.success) {
      showStatus('Tarjeta vinculada con éxito.');
      setManualUidMap(prev => ({ ...prev, [studentId]: '' }));
      router.refresh();
    } else {
      showStatus(res.error || 'Error al vincular', 'error');
    }
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditNombre(student.nombre);
    setEditGrado(student.grado);
    setEditActivo(student.activo);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setIsSavingEdit(true);

    const res = await updateStudentDetails(editingStudent.id, {
      nombre: editNombre,
      grado: editGrado,
      activo: editActivo,
    });

    setIsSavingEdit(false);
    if (res.success) {
      showStatus(`Datos de ${editNombre} actualizados correctamente.`);
      setEditingStudent(null);
      router.refresh();
    } else {
      showStatus(res.error || 'Error al actualizar estudiante', 'error');
    }
  };

  const handleDelete = async (student: Student) => {
    setConfirmDialog({
      isOpen: true,
      title: 'ELIMINAR ESTUDIANTE',
      subtitle: student.nombre,
      message: `¿Estás seguro de que deseas ELIMINAR DEFINITIVAMENTE al estudiante ${student.nombre} (${student.grado}) de la base de datos de la Fundación San Mateo? Esta acción no se puede deshacer.`,
      confirmBtnText: 'Sí, Eliminar Definitivamente',
      confirmBtnClass: 'bg-red-600 hover:bg-red-700 text-white',
      badgeText: 'PELIGRO - BORRADO PERMANENTE',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(prev => ({ ...prev, [student.id]: true }));
        const res = await deleteStudent(student.id);
        setLoading(prev => ({ ...prev, [student.id]: false }));

        if (res.success) {
          showStatus(`Estudiante ${student.nombre} eliminado.`);
          setEditingStudent(null);
          router.refresh();
        } else {
          showStatus(res.error || 'Error al eliminar estudiante', 'error');
        }
      }
    });
  };

  const handleCreateNewStudent = async () => {
    if (!newNombre.trim() || !newGrado.trim()) {
      showStatus('Nombre y Grado son obligatorios.', 'error');
      return;
    }

    setIsCreating(true);
    const res = await createStudent({
      nombre: newNombre,
      grado: newGrado,
      rfid_tag_uid: newUid.trim() || undefined,
    });

    setIsCreating(false);
    if (res.success) {
      showStatus(`Estudiante ${newNombre} creado con éxito.`);
      setCreateModalOpen(false);
      setNewNombre('');
      setNewGrado('');
      setNewUid('');
      router.refresh();
    } else {
      showStatus(res.error || 'Error al crear estudiante', 'error');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSaveBulkGrado = async () => {
    if (!newBulkGrado.trim() || selectedStudentIds.length === 0) {
      showStatus('Por favor ingresa un grado/curso válido.', 'error');
      return;
    }

    setIsBulkSaving(true);
    const res = await bulkUpdateStudentGrado(selectedStudentIds, newBulkGrado);
    setIsBulkSaving(false);

    if (res.success) {
      showStatus(`Grado/Curso actualizado a "${newBulkGrado}" para ${res.count} estudiantes.`);
      setBulkModalOpen(false);
      setSelectedStudentIds([]);
      setNewBulkGrado('');
      router.refresh();
    } else {
      showStatus(res.error || 'Error en actualización masiva', 'error');
    }
  };

  // Filter for Student Active/Frozen Status
  const [filterEstado, setFilterEstado] = useState<'all' | 'active' | 'inactive'>('all');

  const handleToggleFreeze = async (student: Student) => {
    const newActivoState = !student.activo;
    const isFreezing = !newActivoState;

    setConfirmDialog({
      isOpen: true,
      title: isFreezing ? 'CONGELAR ALUMNO Y TARJETA' : 'DESCONGELAR ALUMNO Y TARJETA',
      subtitle: student.nombre,
      message: isFreezing 
        ? `Al congelar al estudiante ${student.nombre} (${student.grado}), se aplazará su estado académico y su tarjeta RFID/NFC quedará INHABILITADA INMEDIATAMENTE en la entrada de la institución.`
        : `Al descongelar al estudiante ${student.nombre} (${student.grado}), su estado cambiará a ACTIVO y su tarjeta volverá a funcionar de inmediato en los lectores.`,
      confirmBtnText: isFreezing ? 'Sí, Congelar Estudiante y Tarjeta' : 'Sí, Descongelar Estudiante',
      confirmBtnClass: isFreezing ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-fsm-blue hover:bg-fsm-red text-white',
      badgeText: isFreezing ? 'APLAZAMIENTO ACADÉMICO' : 'REINTEGRO ACADÉMICO',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(prev => ({ ...prev, [student.id]: true }));
        const res = await updateStudentDetails(student.id, { activo: newActivoState });
        setLoading(prev => ({ ...prev, [student.id]: false }));

        if (res.success) {
          showStatus(`Estudiante ${student.nombre} ${newActivoState ? 'descongelado y reactivado' : 'congelado (aplazado)'} con éxito.`);
          router.refresh();
        } else {
          showStatus(res.error || 'Error al cambiar estado del estudiante', 'error');
        }
      }
    });
  };

  const handleRecordManual = async (student: Student, tipoEvento: 'entrada' | 'salida' = 'entrada') => {
    if (!student.activo) {
      showStatus(`No se puede registrar ${tipoEvento}. El usuario ${student.nombre} está CONGELADO / APLAZADO.`, 'error');
      return;
    }

    setLoading(prev => ({ ...prev, [student.id]: true }));
    const res = await recordManualAttendance(student.id, tipoEvento);
    setLoading(prev => ({ ...prev, [student.id]: false }));

    if (res.success) {
      showStatus(`✓ ${tipoEvento === 'salida' ? 'Salida' : 'Entrada'} manual registrada para ${student.nombre} (${student.grado}).`);
      router.refresh();
    } else {
      showStatus(res.error || 'Error al registrar asistencia', 'error');
    }
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.nombre.toLowerCase().includes(search.toLowerCase()) || 
                          (s.rfid_tag_uid && s.rfid_tag_uid.toLowerCase().includes(search.toLowerCase()));
    const matchesGrado = !filterGrado || s.grado === filterGrado;
    const matchesEstado = filterEstado === 'all' || 
                          (filterEstado === 'active' && s.activo) || 
                          (filterEstado === 'inactive' && !s.activo);
    return matchesSearch && matchesGrado && matchesEstado;
  });

  const grades = Array.from(new Set(students.map(s => s.grado))).sort();
  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id));

  return (
    <div className="space-y-8">
      {/* Status Alert Banner */}
      {statusMsg.text && (
        <div className={`p-4 rounded-xl border font-bold text-xs uppercase tracking-widest ${
          statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-fsm-red border-red-200'
        }`}>
          {statusMsg.text}
        </div>
      )}

      {/* Enrollment Listening Banner */}
      {activeStudentId && activeStudent && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-pulse">
          <div className="flex items-center gap-4 text-fsm-red">
            <div className="w-12 h-12 bg-fsm-red/10 rounded-full flex items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-fsm-red" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-fsm-red/70">MODO VINCULACIÓN ACTIVO</span>
              <h3 className="text-lg font-black uppercase text-fsm-red leading-none mt-1">ESPERANDO ESCANEO FISICO</h3>
              <p className="text-xs font-semibold text-gray-700 mt-1">
                Acerca una tarjeta a cualquier lector para asociarla automáticamente a: <strong className="uppercase">{activeStudent.nombre} ({activeStudent.grado})</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelEnrollment}
            className="px-6 py-2.5 bg-fsm-red text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red-deep transition-all flex items-center gap-2"
          >
            <X size={14} /> Cancelar Espera
          </button>
        </div>
      )}

      {/* Pending Tag UID Banner */}
      {pendingUid && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700">
            <AlertCircle size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-yellow-800/70">TARJETA PENDIENTE DE VINCULAR</span>
            <h3 className="text-lg font-black uppercase text-yellow-800 leading-none mt-1">UID DETECTADO: {pendingUid}</h3>
            <p className="text-xs font-semibold text-gray-700 mt-1">
              Selecciona un estudiante de la lista haciendo clic en el botón <strong className="text-yellow-700">"Vincular {pendingUid}"</strong> para asociar esta tarjeta de inmediato.
            </p>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={16} /> Crear Nuevo Estudiante
          </button>

          {selectedStudentIds.length > 0 && (
            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-5 py-2.5 bg-purple-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-800 transition-all shadow-sm flex items-center gap-2 animate-bounce"
            >
              <Layers size={16} /> Cambiar Grado Masivo ({selectedStudentIds.length})
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-gray-500 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={allFilteredSelected}
              onChange={e => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-fsm-blue focus:ring-fsm-blue"
            />
            <span>Seleccionar todos los visibles ({filteredStudents.length})</span>
          </label>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full md:w-72">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar estudiante o UID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent font-bold text-xs text-gray-700 outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full md:w-48">
            <select
              value={filterGrado}
              onChange={e => setFilterGrado(e.target.value)}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none w-full"
            >
              <option value="">Todos los Grados/Turnos</option>
              {grades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full md:w-48">
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value as any)}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none w-full"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Solo Activos (En Estudio)</option>
              <option value="inactive">Solo Aplazados / Congelados</option>
            </select>
          </div>
        </div>
        
        <div className="text-xs font-black text-gray-500 uppercase tracking-widest">
          Estudiantes: {filteredStudents.length} / {students.length}
        </div>
      </div>

      {/* Student List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center text-sm font-medium text-gray-400 rounded-[2rem] border border-gray-100 shadow-premium">
            No se encontraron estudiantes que coincidan con los filtros seleccionados.
          </div>
        ) : (
          filteredStudents.map(student => {
            const isPendingLink = pendingUid && !student.rfid_tag_uid;
            const isSelected = selectedStudentIds.includes(student.id);
            
            return (
              <div 
                key={student.id} 
                className={`bg-white p-6 rounded-[2rem] border shadow-premium transition-all duration-300 flex flex-col justify-between gap-6 relative ${
                  !student.activo ? 'border-amber-200 bg-amber-50/20 opacity-85' :
                  isSelected ? 'border-purple-300 ring-2 ring-purple-100' :
                  isPendingLink ? 'border-yellow-200 bg-yellow-50/10' : 'border-gray-100 hover:border-fsm-blue/20'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(student.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-fsm-blue focus:ring-fsm-blue"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black text-fsm-blue uppercase bg-fsm-blue/5 px-2 py-0.5 rounded">
                          Grado/Curso: {student.grado}
                        </span>
                        {!student.activo ? (
                          <span className="text-[9px] font-black text-amber-800 uppercase bg-amber-100 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                            ❄️ APLAZADO / CONGELADO
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-green-700 uppercase bg-green-50 px-2 py-0.5 rounded">
                            ✓ ACTIVO
                          </span>
                        )}
                        <button 
                          onClick={() => openEditModal(student)}
                          className="text-gray-400 hover:text-fsm-blue transition-colors p-1"
                          title="Editar Grado, Curso o Turno"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                      <h4 className="text-lg font-black text-fsm-blue uppercase mt-1 leading-tight">{student.nombre}</h4>
                      {student.rfid_tag_uid ? (
                        <p className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1">
                          <Check size={14} /> Tarjeta vinculada: <span className="font-mono bg-green-50 px-2 py-0.5 rounded text-[10px]">{student.rfid_tag_uid}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1">
                          <AlertTriangle size={14} className="text-gray-400" /> Sin tarjeta vinculada
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {student.activo && (
                      <>
                        <button
                          onClick={() => handleRecordManual(student, 'entrada')}
                          disabled={loading[student.id]}
                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all text-xs font-bold rounded-xl flex items-center gap-1"
                          title="Marcar entrada manual"
                        >
                          <UserCheck size={12} /> Entrada
                        </button>
                        <button
                          onClick={() => handleRecordManual(student, 'salida')}
                          disabled={loading[student.id]}
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-600 hover:text-white transition-all text-xs font-bold rounded-xl flex items-center gap-1"
                          title="Marcar salida manual"
                        >
                          <UserCheck size={12} /> Salida
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleToggleFreeze(student)}
                      disabled={loading[student.id]}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        student.activo 
                          ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-amber-100 hover:text-amber-900' 
                          : 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-sm'
                      }`}
                      title={student.activo ? 'Congelar / Aplazar alumno' : 'Descongelar y reactivar alumno'}
                    >
                      {student.activo ? '❄️ Congelar' : '🔥 Descongelar'}
                    </button>
                    <button
                      onClick={() => openEditModal(student)}
                      className="px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-100 hover:bg-fsm-blue hover:text-white transition-all text-xs font-bold rounded-xl flex items-center gap-1"
                    >
                      <Edit2 size={12} /> Editar
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-gray-50">
                  {student.rfid_tag_uid ? (
                    <button
                      onClick={() => handleUnlink(student.id)}
                      disabled={loading[student.id]}
                      className="w-full py-2.5 bg-red-50 text-fsm-red rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red hover:text-white transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading[student.id] ? 'Procesando...' : 'Desvincular Tarjeta'}
                    </button>
                  ) : (
                    <>
                      {/* Scenario 1: Linking pending tag directly */}
                      {pendingUid ? (
                        <button
                          onClick={() => handleManualLink(student.id, pendingUid)}
                          disabled={loading[student.id]}
                          className="w-full py-2.5 bg-yellow-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-yellow-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <LinkIcon size={14} /> Vincular Tarjeta {pendingUid}
                        </button>
                      ) : (
                        <>
                          {/* Scenario 2: Active Listening Mode */}
                          <button
                            onClick={() => handleStartEnrollment(student.id)}
                            disabled={loading[student.id] || !!activeStudentId}
                            className="w-full py-2.5 bg-fsm-blue/5 text-fsm-blue rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-blue hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <RefreshCw size={14} /> Esperar Escaneo Físico
                          </button>
                          
                          {/* Scenario 3: Manual Input */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="UID Manual (ej: 04A2B3C4)"
                              value={manualUidMap[student.id] || ''}
                              onChange={e => setManualUidMap(prev => ({ ...prev, [student.id]: e.target.value }))}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none"
                            />
                            <button
                              onClick={() => handleManualLink(student.id)}
                              disabled={loading[student.id]}
                              className="px-4 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                            >
                              Vincular
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Edit Student Details Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest">EDITAR DATOS DE ESTUDIANTE</span>
                <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight mt-0.5">{editingStudent.nombre}</h3>
              </div>
              <button 
                onClick={() => setEditingStudent(null)}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Nombre Completo:</label>
                <input 
                  type="text" 
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Grado / Curso / Turno:</label>
                <input 
                  type="text" 
                  value={editGrado}
                  onChange={e => setEditGrado(e.target.value)}
                  placeholder="Ej: 10A, 11B, 3 SABADO A, NOCTURNO B"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="editActivo"
                  checked={editActivo}
                  onChange={e => setEditActivo(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-fsm-blue focus:ring-fsm-blue"
                />
                <label htmlFor="editActivo" className="text-xs font-bold uppercase text-gray-700 cursor-pointer">
                  Estudiante Activo en la Institución
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleDelete(editingStudent)}
                className="px-4 py-2 bg-red-50 text-fsm-red hover:bg-fsm-red hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1"
              >
                <Trash2 size={14} /> Eliminar
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={14} /> {isSavingEdit ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Create New Student Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest">NUEVO REGISTRO</span>
                <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight mt-0.5">CREAR NUEVO ESTUDIANTE</h3>
              </div>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Nombre Completo:*</label>
                <input 
                  type="text" 
                  placeholder="Ej: MARÍA CAMILA RODRÍGUEZ"
                  value={newNombre}
                  onChange={e => setNewNombre(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Grado / Curso / Turno:*</label>
                <input 
                  type="text" 
                  placeholder="Ej: 10A, 11B, 3 SABADO A, NOCTURNO B"
                  value={newGrado}
                  onChange={e => setNewGrado(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">UID Tarjeta RFID (Opcional):</label>
                <input 
                  type="text" 
                  placeholder="Ej: 5400357EAC"
                  value={newUid}
                  onChange={e => setNewUid(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateNewStudent}
                disabled={isCreating}
                className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Plus size={16} /> {isCreating ? 'Creando...' : 'Crear Estudiante'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Bulk Update Grade Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest">ACTUALIZACIÓN MASIVA</span>
                <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight mt-0.5">CAMBIAR GRADO/CURSO</h3>
              </div>
              <button 
                onClick={() => setBulkModalOpen(false)}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-600">
                Se cambiará el grado/curso a los <strong className="text-purple-700">{selectedStudentIds.length} estudiantes seleccionados</strong>.
              </p>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Nuevo Grado / Curso / Turno:</label>
                <input 
                  type="text" 
                  placeholder="Ej: 11A, PROMO 2026, 3 SABADO B"
                  value={newBulkGrado}
                  onChange={e => setNewBulkGrado(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-purple-600"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveBulkGrado}
                disabled={isBulkSaving}
                className="px-6 py-2.5 bg-purple-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-800 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={14} /> {isBulkSaving ? 'Aplicando...' : 'Aplicar a Selección'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Custom Branded Fundación San Mateo Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-md p-8 text-center space-y-6 animate-in zoom-in-95 duration-200 relative">
            
            {/* Header Logo */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-16 h-16 relative bg-fsm-blue/5 rounded-full p-2 border border-fsm-blue/10 flex items-center justify-center shadow-inner">
                <Image src="/FSM.png" alt="Escudo Fundación San Mateo" width={48} height={48} className="object-contain" />
              </div>
              {confirmDialog.badgeText && (
                <span className="text-[9px] font-black text-fsm-blue tracking-widest uppercase bg-fsm-blue/5 border border-fsm-blue/10 px-3 py-1 rounded-full">
                  {confirmDialog.badgeText}
                </span>
              )}
            </div>

            {/* Modal Title & Body */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-fsm-blue uppercase tracking-tight leading-tight">
                {confirmDialog.title}
              </h3>
              {confirmDialog.subtitle && (
                <p className="text-xs font-black text-fsm-red uppercase tracking-wider">
                  {confirmDialog.subtitle}
                </p>
              )}
              <p className="text-xs font-semibold text-gray-600 leading-relaxed pt-2">
                {confirmDialog.message}
              </p>
            </div>

            {/* Action Buttons */}
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
                  confirmDialog.confirmBtnClass || 'bg-fsm-blue text-white hover:bg-fsm-red'
                }`}
              >
                {confirmDialog.confirmBtnText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


