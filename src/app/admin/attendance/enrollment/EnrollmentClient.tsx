"use client";

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import { 
  setEnrollmentStudent, linkStudentTag, unlinkStudentTag, 
  updateStudentDetails, createStudent, bulkUpdateStudentGrado, deleteStudent, 
  recordManualAttendance, ensureStudentEnrollment 
} from '@/app/actions';
import { 
  Tag, Search, AlertTriangle, ArrowLeft, RefreshCw, 
  Check, X, Link as LinkIcon, AlertCircle, Plus, Edit2, Save, Trash2, Users, Layers, UserCheck, CheckCircle2, ShieldAlert,
  Phone, Mail, MapPin, Calendar, CreditCard, School, GraduationCap, Building2, Sparkles, User, Fingerprint
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getAcademicGroupConfig, OFFICIAL_GROUPS } from '@/lib/academicCatalog';
import CreateGroupModal from '../CreateGroupModal';

export interface GroupItem {
  id: string;
  nombre: string;
  jornada: string;
  tipo?: string | null;
  programa_codigo?: string | null;
  programa_nombre?: string | null;
  semestre_romano?: string | null;
}

interface Student {
  id: string;
  nombre: string;
  documento?: string | null;
  usuario_nro?: string | null;
  grado: string;
  grupo_matriculado?: string | null;
  rfid_tag_uid: string | null;
  tarjeta_numero?: string | null;
  telefono?: string | null;
  email?: string | null;
  domicilio?: string | null;
  departamento?: string | null;
  sede?: number | null;
  cumpleanos?: string | null;
  inicio_practicas?: string | null;
  activo: boolean;
}

interface EnrollmentClientProps {
  students: Student[];
  activeStudentId: string | null;
  pendingUid?: string;
  availableGroups?: GroupItem[];
}

export default function EnrollmentClient({ 
  students, 
  activeStudentId, 
  pendingUid = '',
  availableGroups = []
}: EnrollmentClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [displayLimit, setDisplayLimit] = useState(40);
  const [filterPrograma, setFilterPrograma] = useState('all');
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
  const [editTipoDoc, setEditTipoDoc] = useState('CC');
  const [editDocumento, setEditDocumento] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editGrado, setEditGrado] = useState('');
  const [editDepartamento, setEditDepartamento] = useState('');
  const [editSede, setEditSede] = useState(1);
  const [editTelefono, setEditTelefono] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDomicilio, setEditDomicilio] = useState('');
  const [editTarjetaNumero, setEditTarjetaNumero] = useState('');
  const [editUid, setEditUid] = useState('');
  const [editCumpleanos, setEditCumpleanos] = useState('');
  const [editInicioPracticas, setEditInicioPracticas] = useState('');
  const [editActivo, setEditActivo] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal for Creating New Student
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTipoDoc, setNewTipoDoc] = useState('CC');
  const [newDocumento, setNewDocumento] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newGrado, setNewGrado] = useState('');
  const [newDepartamento, setNewDepartamento] = useState('');
  const [newSede, setNewSede] = useState(1);
  const [newTelefono, setNewTelefono] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDomicilio, setNewDomicilio] = useState('');
  const [newTarjetaNumero, setNewTarjetaNumero] = useState('');
  const [newUid, setNewUid] = useState('');
  const [newCumpleanos, setNewCumpleanos] = useState('');
  const [newInicioPracticas, setNewInicioPracticas] = useState('');
  const [newActivo, setNewActivo] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);

  // Merge static catalog with any dynamic groups passed in props
  const allGroups = useMemo(() => {
    const map = new Map<string, { name: string; programCode: string; programName: string; shift: string; calendar: string }>();
    OFFICIAL_GROUPS.forEach(g => {
      map.set(g.name, { 
        name: g.name, 
        programCode: g.programCode, 
        programName: g.programName,
        shift: g.shift,
        calendar: g.calendar
      });
    });
    if (availableGroups) {
      availableGroups.forEach(g => {
        if (!map.has(g.nombre)) {
          map.set(g.nombre, {
            name: g.nombre,
            programCode: g.programa_codigo || 'TAE',
            programName: g.programa_nombre || g.nombre,
            shift: g.jornada || 'DIURNO',
            calendar: g.tipo || 'REGULAR'
          });
        }
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableGroups]);

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

    let doc = (student.documento || '').trim();
    let tipo = 'CC';
    const match = doc.match(/^(CC|TI|CE|PPT|PA|RC)\s*(.*)$/i);
    if (match) {
      tipo = match[1].toUpperCase();
      doc = match[2].trim();
    }
    setEditTipoDoc(tipo);
    setEditDocumento(doc);

    setEditGrado(student.grado);
    setEditDepartamento(student.departamento || '');
    setEditSede(student.sede ?? 1);
    setEditTelefono(student.telefono || '');
    setEditEmail(student.email || '');
    setEditDomicilio(student.domicilio || '');
    setEditTarjetaNumero(student.tarjeta_numero || '');
    setEditUid(student.rfid_tag_uid || '');
    setEditCumpleanos(student.cumpleanos || '');
    setEditInicioPracticas(student.inicio_practicas || '');
    setEditActivo(student.activo);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    if (!editNombre.trim()) {
      showStatus('El nombre completo es obligatorio.', 'error');
      return;
    }
    if (!editDocumento.trim()) {
      showStatus('El número de documento / cédula es obligatorio.', 'error');
      return;
    }
    if (!editGrado.trim()) {
      showStatus('El curso / grado oficial es obligatorio.', 'error');
      return;
    }

    setIsSavingEdit(true);
    const formattedDoc = `${editTipoDoc} ${editDocumento.trim().replace(/\s+/g, '')}`.trim();

    const res = await updateStudentDetails(editingStudent.id, {
      nombre: editNombre,
      documento: formattedDoc,
      grado: editGrado,
      departamento: editDepartamento.trim() || undefined,
      sede: editSede,
      telefono: editTelefono.trim() || undefined,
      email: editEmail.trim() || undefined,
      domicilio: editDomicilio.trim() || undefined,
      tarjeta_numero: editTarjetaNumero.trim() || undefined,
      rfid_tag_uid: editUid.trim() || undefined,
      cumpleanos: editCumpleanos || undefined,
      inicio_practicas: editInicioPracticas || undefined,
      activo: editActivo,
    });

    setIsSavingEdit(false);
    if (res.success) {
      showStatus(`✓ Datos de ${editNombre} actualizados correctamente.`);
      setEditingStudent(null);
      router.refresh();
    } else {
      showStatus(res.error || 'Error al actualizar estudiante', 'error');
    }
  };

  const handleQuickEnroll = async (studentId: string) => {
    setLoading(prev => ({ ...prev, [studentId]: true }));
    const res = await ensureStudentEnrollment(studentId);
    setLoading(prev => ({ ...prev, [studentId]: false }));

    if (res.success) {
      showStatus(`✓ Estudiante matriculado oficialmente en ${res.groupName}.`);
      router.refresh();
    } else {
      showStatus(res.error || 'Error al matricular estudiante', 'error');
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
    if (!newNombre.trim()) {
      showStatus('El nombre completo del estudiante es obligatorio.', 'error');
      return;
    }
    if (!newDocumento.trim()) {
      showStatus('La cédula / documento de identidad es obligatoria para coherencia en torniquetes y padrón.', 'error');
      return;
    }
    if (!newGrado.trim()) {
      showStatus('Debes seleccionar el curso/grado o carrera oficial.', 'error');
      return;
    }

    setIsCreating(true);
    const formattedDoc = `${newTipoDoc} ${newDocumento.trim().replace(/\s+/g, '')}`.trim();

    const res = await createStudent({
      nombre: newNombre,
      documento: formattedDoc,
      grado: newGrado,
      departamento: newDepartamento.trim() || undefined,
      sede: newSede,
      telefono: newTelefono.trim() || undefined,
      email: newEmail.trim() || undefined,
      domicilio: newDomicilio.trim() || undefined,
      tarjeta_numero: newTarjetaNumero.trim() || undefined,
      rfid_tag_uid: newUid.trim() || undefined,
      cumpleanos: newCumpleanos || undefined,
      inicio_practicas: newInicioPracticas || undefined,
      activo: newActivo,
    });

    setIsCreating(false);
    if (res.success) {
      showStatus(`✓ Estudiante ${newNombre} creado, registrado y matriculado en ${newGrado}.`);
      setCreateModalOpen(false);
      setNewTipoDoc('CC');
      setNewDocumento('');
      setNewNombre('');
      setNewGrado('');
      setNewDepartamento('');
      setNewSede(1);
      setNewTelefono('');
      setNewEmail('');
      setNewDomicilio('');
      setNewTarjetaNumero('');
      setNewUid('');
      setNewCumpleanos('');
      setNewInicioPracticas('');
      setNewActivo(true);
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

  // Reset display limit when filter criteria change
  useEffect(() => {
    setDisplayLimit(40);
  }, [deferredSearch, filterGrado, filterPrograma, filterEstado]);

  // Filter students (memoized and evaluated against deferred search)
  const filteredStudents = useMemo(() => {
    const searchTerms = deferredSearch.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return students.filter(s => {
      const searchableText = `${s.nombre} ${s.documento || ''} ${s.grado || ''} ${s.rfid_tag_uid || ''} ${s.tarjeta_numero || ''} ${s.telefono || ''} ${s.email || ''} ${s.domicilio || ''}`.toLowerCase();
      const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => searchableText.includes(term));
      const matchesGrado = !filterGrado || 
                           s.grado === filterGrado ||
                           (filterGrado === 'II DIURNO A CB' && s.grado === 'II DIURNO CB') ||
                           (filterGrado === 'II DIURNO CB' && s.grado === 'II DIURNO A CB');
      const matchesPrograma = filterPrograma === 'all' || (() => {
        const cfg = getAcademicGroupConfig(s.grado);
        if (!cfg) return false;
        return cfg.programCode === filterPrograma;
      })();
      const matchesEstado = filterEstado === 'all' || 
                            (filterEstado === 'active' && s.activo) || 
                            (filterEstado === 'inactive' && !s.activo);
      return matchesSearch && matchesGrado && matchesPrograma && matchesEstado;
    });
  }, [students, deferredSearch, filterGrado, filterPrograma, filterEstado]);

  // Progressive rendering: slice for ultra-fast DOM operations
  const displayedStudents = useMemo(() => {
    return filteredStudents.slice(0, displayLimit);
  }, [filteredStudents, displayLimit]);

  const grades = useMemo(() => Array.from(new Set(students.map(s => s.grado))).sort(), [students]);
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
              value={filterPrograma}
              onChange={e => {
                setFilterPrograma(e.target.value);
                setFilterGrado('');
              }}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none w-full"
            >
              <option value="all">Todos los Programas</option>
              <option value="TAE">🩺 Enfermería TAE</option>
              <option value="AIPI">👶 Primera Infancia</option>
              <option value="PREESCOLAR">🎒 Preescolar</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full md:w-48">
            <select
              value={filterGrado}
              onChange={e => setFilterGrado(e.target.value)}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none w-full"
            >
              <option value="">Todos los Grados/Turnos</option>
              {(() => {
                const renderGradeOption = (g: string) => {
                  const count = students.filter(s => s.grado === g).length;
                  const label = g === 'II DIURNO A CB' ? 'II DIURNO A CB [II DIURNO CB]' : g;
                  return <option key={g} value={g}>{label} ({count})</option>;
                };

                if (filterPrograma === 'all') {
                  return (
                    <>
                      <optgroup label="🩺 Enfermería TAE">
                        {grades.filter(g => getAcademicGroupConfig(g)?.programCode === 'TAE').map(renderGradeOption)}
                      </optgroup>
                      <optgroup label="👶 Primera Infancia AIPI">
                        {grades.filter(g => getAcademicGroupConfig(g)?.programCode === 'AIPI').map(renderGradeOption)}
                      </optgroup>
                      <optgroup label="🎒 Preescolar">
                        {grades.filter(g => getAcademicGroupConfig(g)?.programCode === 'PREESCOLAR').map(renderGradeOption)}
                      </optgroup>
                      {grades.filter(g => !getAcademicGroupConfig(g)).length > 0 && (
                        <optgroup label="Otros / Sin Clasificar">
                          {grades.filter(g => !getAcademicGroupConfig(g)).map(renderGradeOption)}
                        </optgroup>
                      )}
                    </>
                  );
                }

                return grades
                  .filter(g => getAcademicGroupConfig(g)?.programCode === filterPrograma)
                  .map(renderGradeOption);
              })()}
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
          Mostrando {Math.min(displayLimit, filteredStudents.length)} de {filteredStudents.length} {filteredStudents.length !== students.length ? `(de ${students.length} totales)` : ''}
        </div>
      </div>
      {/* Student List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center text-sm font-medium text-gray-400 rounded-[2rem] border border-gray-100 shadow-premium">
            No se encontraron estudiantes que coincidan con los filtros seleccionados.
          </div>
        ) : (
          displayedStudents.map(student => {
            const hasCard = Boolean(student.rfid_tag_uid || student.tarjeta_numero);
            const isPendingLink = pendingUid && !hasCard;
            const isSelected = selectedStudentIds.includes(student.id);
            
            return (
              <div 
                key={student.id} 
                className={`bg-white p-6 rounded-[2rem] border shadow-premium transition-all duration-300 flex flex-col justify-between gap-6 relative ${
                  !student.activo ? 'border-amber-200 bg-amber-50/20 opacity-85' :
                  isSelected ? 'border-purple-300 ring-2 ring-purple-100' :
                  isPendingLink ? 'border-yellow-400 ring-4 ring-yellow-100' : 'border-gray-100 hover:border-fsm-blue/20'
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
                        {student.grupo_matriculado ? (
                          <span className="text-[9px] font-black text-emerald-800 uppercase bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-600" /> Grupo: {student.grupo_matriculado}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-black text-amber-800 uppercase bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1" title="El estudiante no tiene matrícula activa en un grupo oficial">
                              <ShieldAlert size={11} className="text-amber-600" /> Sin matrícula
                            </span>
                            <button
                              onClick={() => handleQuickEnroll(student.id)}
                              disabled={loading[student.id]}
                              className="text-[9px] font-black uppercase tracking-wider bg-fsm-blue hover:bg-blue-900 text-white px-1.5 py-0.5 rounded transition-all active:scale-95 disabled:opacity-50"
                              title={`Inscribir automáticamente al grupo oficial de ${student.grado}`}
                            >
                              Inscribir
                            </button>
                          </div>
                        )}
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
                          title="Editar Datos, Documento o Curso"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                      <h4 className="text-lg font-black text-fsm-blue uppercase mt-1 leading-tight">{student.nombre}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-700 font-bold flex items-center gap-1">
                          📄 Cédula / Doc: <strong className="font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{student.documento || 'SIN DOCUMENTO'}</strong>
                        </span>
                        {hasCard ? (
                          <span className="text-xs text-green-700 font-bold flex items-center gap-1">
                            <Check size={14} className="text-green-600" /> Tarjeta: <strong className="font-mono bg-green-50 px-1.5 py-0.5 rounded text-[11px]">{student.tarjeta_numero ? `#${student.tarjeta_numero}` : student.rfid_tag_uid}</strong>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                            <AlertTriangle size={14} className="text-gray-400" /> Sin tarjeta
                          </span>
                        )}
                        {student.telefono && (
                          <a 
                            href={`tel:${student.telefono}`}
                            className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 bg-blue-50/70 border border-blue-100 px-2 py-0.5 rounded-lg"
                            title="Llamar para seguimiento de asistencia"
                          >
                            <Phone size={11} className="text-blue-600" /> {student.telefono}
                          </a>
                        )}
                        {student.email && (
                          <a 
                            href={`mailto:${student.email}`}
                            className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 bg-purple-50/70 border border-purple-100 px-2 py-0.5 rounded-lg"
                            title="Enviar correo institucional"
                          >
                            <Mail size={11} className="text-purple-600" /> {student.email}
                          </a>
                        )}
                      </div>
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
                  {hasCard ? (
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

        {filteredStudents.length > displayLimit && (
          <div className="col-span-full flex flex-col sm:flex-row items-center justify-center gap-3 py-6">
            <button
              type="button"
              onClick={() => setDisplayLimit(prev => prev + 40)}
              className="px-6 py-3 bg-fsm-blue hover:bg-fsm-blue/90 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-sm transition-all flex items-center gap-2"
            >
              <span>➕ Cargar Más Estudiantes (+40 de {filteredStudents.length - displayLimit} restantes)</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayLimit(filteredStudents.length)}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-widest rounded-2xl transition-all"
            >
              Mostrar Todos ({filteredStudents.length})
            </button>
          </div>
        )}
      </div>

      {/* Modal 1: Edit Student Details Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-3xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-fsm-blue/10 flex items-center justify-center p-1.5 border border-fsm-blue/20">
                  <Image src="/FSM.png" alt="FSM" width={32} height={32} className="object-contain" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest">EXPEDIENTE DEL ESTUDIANTE</span>
                  <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight mt-0.5">{editingStudent.nombre}</h3>
                </div>
              </div>
              <button 
                onClick={() => setEditingStudent(null)}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1.5 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body - Scrollable */}
            <div className="p-8 space-y-6 overflow-y-auto">
              {/* Sección 1: Identificación y Datos Personales */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <User size={16} className="text-fsm-blue" />
                  <h4 className="text-xs font-black uppercase text-fsm-blue tracking-wider">1. Identificación y Datos Personales</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Tipo de Documento:</label>
                    <select
                      value={editTipoDoc}
                      onChange={e => setEditTipoDoc(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue bg-white"
                    >
                      <option value="CC">CC - Cédula de Ciudadanía</option>
                      <option value="TI">TI - Tarjeta de Identidad</option>
                      <option value="CE">CE - Cédula de Extranjería</option>
                      <option value="PPT">PPT - Protección Temporal</option>
                      <option value="PA">PA - Pasaporte</option>
                      <option value="RC">RC - Registro Civil</option>
                    </select>
                  </div>
                  <div className="sm:col-span-8">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Número de Documento / Cédula:*</label>
                    <input 
                      type="text" 
                      value={editDocumento}
                      onChange={e => setEditDocumento(e.target.value)}
                      placeholder="Ej: 1024567890"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue bg-white"
                    />
                  </div>
                  <div className="sm:col-span-8">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Nombre Completo (Apellidos y Nombres):*</label>
                    <input 
                      type="text" 
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                      placeholder="Ej: ABELLO FUENTES JUAN DAVID"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue bg-white"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Fecha de Nacimiento:</label>
                    <input 
                      type="date" 
                      value={editCumpleanos}
                      onChange={e => setEditCumpleanos(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Asignación Académica y Sede */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <GraduationCap size={16} className="text-emerald-700" />
                  <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">2. Asignación Académica y Sede Oficial</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-black uppercase text-gray-500">Curso Oficial de Matrícula:*</label>
                      <button
                        type="button"
                        onClick={() => setCreateGroupModalOpen(true)}
                        className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 uppercase flex items-center gap-1 transition-colors"
                      >
                        <Plus size={12} /> Crear Nuevo Curso
                      </button>
                    </div>
                    <select
                      value={allGroups.some(g => g.name === editGrado) ? editGrado : ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val) {
                          setEditGrado(val);
                          const cfg = getAcademicGroupConfig(val);
                          if (cfg) setEditDepartamento(cfg.programName);
                        }
                      }}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-emerald-600 bg-white mb-2"
                    >
                      <option value="">-- Seleccionar Curso Oficial --</option>
                      <optgroup label="🩺 Técnico Auxiliar en Enfermería (TAE)">
                        {allGroups.filter(g => g.programCode === 'TAE').map(g => (
                          <option key={g.name} value={g.name}>{g.name} ({g.shift} {g.calendar === 'CB' ? '• Calendario B' : ''})</option>
                        ))}
                      </optgroup>
                      <optgroup label="👶 Atención a la Primera Infancia (AIPI)">
                        {allGroups.filter(g => g.programCode === 'AIPI').map(g => (
                          <option key={g.name} value={g.name}>{g.name} ({g.shift})</option>
                        ))}
                      </optgroup>
                      <optgroup label="🎒 Técnico Auxiliar en Preescolar">
                        {allGroups.filter(g => g.programCode === 'PREESCOLAR').map(g => (
                          <option key={g.name} value={g.name}>{g.name} ({g.shift})</option>
                        ))}
                      </optgroup>
                      {allGroups.filter(g => !['TAE', 'AIPI', 'PREESCOLAR'].includes(g.programCode)).length > 0 && (
                        <optgroup label="Otros Cursos Institucionales">
                          {allGroups.filter(g => !['TAE', 'AIPI', 'PREESCOLAR'].includes(g.programCode)).map(g => (
                            <option key={g.name} value={g.name}>{g.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <input 
                      type="text" 
                      value={editGrado}
                      onChange={e => setEditGrado(e.target.value)}
                      placeholder="O escribe el curso personalizado..."
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg font-bold text-[11px] uppercase outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Programa / Carrera:</label>
                    <input 
                      type="text" 
                      value={editDepartamento}
                      onChange={e => setEditDepartamento(e.target.value)}
                      placeholder="Ej: Enfermería TAE"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Sede Institucional:</label>
                    <select
                      value={editSede}
                      onChange={e => setEditSede(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value={1}>Sede Principal Soacha (Centro)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Inicio de Prácticas (Opcional):</label>
                    <input 
                      type="date" 
                      value={editInicioPracticas}
                      onChange={e => setEditInicioPracticas(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Contacto y Residencia (Para Asistencias) */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <Phone size={16} className="text-blue-600" />
                  <h4 className="text-xs font-black uppercase text-blue-800 tracking-wider">3. Contacto y Seguimiento de Inasistencias</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Teléfono / Celular de Contacto:</label>
                    <input 
                      type="tel" 
                      value={editTelefono}
                      onChange={e => setEditTelefono(e.target.value)}
                      placeholder="Ej: 3101234567"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Correo Electrónico:</label>
                    <input 
                      type="email" 
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      placeholder="Ej: estudiante@ejemplo.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-12">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Dirección de Domicilio / Residencia:</label>
                    <input 
                      type="text" 
                      value={editDomicilio}
                      onChange={e => setEditDomicilio(e.target.value)}
                      placeholder="Ej: Calle 13 # 7-45 Soacha Centro"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-xs uppercase outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 4: Control de Acceso y Tarjeta RFID */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <CreditCard size={16} className="text-purple-600" />
                  <h4 className="text-xs font-black uppercase text-purple-800 tracking-wider">4. Control de Acceso, Torniquetes y Tarjeta RFID</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Número de Tarjeta Física (Plástico):</label>
                    <input 
                      type="text" 
                      value={editTarjetaNumero}
                      onChange={e => setEditTarjetaNumero(e.target.value)}
                      placeholder="Ej: 3056834 (Impreso en la tarjeta)"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-purple-600 bg-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-black uppercase text-gray-500">UID Chip RFID / NFC:</label>
                      {pendingUid && (
                        <button
                          type="button"
                          onClick={() => setEditUid(pendingUid)}
                          className="text-[9px] font-black text-purple-700 hover:text-purple-900 uppercase underline"
                        >
                          Usar {pendingUid}
                        </button>
                      )}
                    </div>
                    <input 
                      type="text" 
                      value={editUid}
                      onChange={e => setEditUid(e.target.value.toUpperCase())}
                      placeholder="Ej: 5400357EAC"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-purple-600 bg-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-12 pt-2">
                    <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={editActivo}
                        onChange={e => setEditActivo(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-fsm-blue focus:ring-fsm-blue"
                      />
                      <span className="text-xs font-bold uppercase text-gray-800">
                        Estudiante Activo en la Institución (Habilitado para ingreso y planilla)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <button
                type="button"
                onClick={() => handleDelete(editingStudent)}
                className="px-4 py-2.5 bg-red-50 text-fsm-red hover:bg-fsm-red hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1.5"
              >
                <Trash2 size={15} /> Eliminar
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
                >
                  <Save size={15} /> {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Create New Student Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-3xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-fsm-blue/10 flex items-center justify-center p-1.5 border border-fsm-blue/20">
                  <Image src="/FSM.png" alt="FSM" width={32} height={32} className="object-contain" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest">REGISTRO Y MATRÍCULA OFICIAL</span>
                  <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight mt-0.5">CREAR NUEVO ESTUDIANTE</h3>
                </div>
              </div>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1.5 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body - Scrollable */}
            <div className="p-8 space-y-6 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-600 leading-relaxed -mt-2">
                Ingresa los datos del estudiante. Al crearlo, el sistema lo registrará en el padrón institucional y lo <strong>matriculará automáticamente en su grupo oficial</strong> para que aparezca de inmediato en planillas docentes y en torniquetes.
              </p>

              {/* Sección 1: Identificación y Datos Personales */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <User size={16} className="text-fsm-blue" />
                  <h4 className="text-xs font-black uppercase text-fsm-blue tracking-wider">1. Identificación y Datos Personales</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Tipo de Documento:</label>
                    <select
                      value={newTipoDoc}
                      onChange={e => setNewTipoDoc(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue bg-white"
                    >
                      <option value="CC">CC - Cédula de Ciudadanía</option>
                      <option value="TI">TI - Tarjeta de Identidad</option>
                      <option value="CE">CE - Cédula de Extranjería</option>
                      <option value="PPT">PPT - Protección Temporal</option>
                      <option value="PA">PA - Pasaporte</option>
                      <option value="RC">RC - Registro Civil</option>
                    </select>
                  </div>
                  <div className="sm:col-span-8">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Número de Documento / Cédula:*</label>
                    <input 
                      type="text" 
                      value={newDocumento}
                      onChange={e => setNewDocumento(e.target.value)}
                      placeholder="Ej: 1024567890 (Sin puntos ni espacios)"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue bg-white"
                    />
                  </div>
                  <div className="sm:col-span-8">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Nombre Completo (Apellidos y Nombres):*</label>
                    <input 
                      type="text" 
                      value={newNombre}
                      onChange={e => setNewNombre(e.target.value)}
                      placeholder="Ej: PÉREZ LÓPEZ JUAN CARLOS"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue bg-white"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Fecha de Nacimiento:</label>
                    <input 
                      type="date" 
                      value={newCumpleanos}
                      onChange={e => setNewCumpleanos(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Asignación Académica y Sede */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <GraduationCap size={16} className="text-emerald-700" />
                  <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">2. Asignación Académica y Sede Oficial</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-black uppercase text-gray-500">Curso Oficial de Matrícula:*</label>
                      <button
                        type="button"
                        onClick={() => setCreateGroupModalOpen(true)}
                        className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 uppercase flex items-center gap-1 transition-colors"
                      >
                        <Plus size={12} /> Crear Nuevo Curso
                      </button>
                    </div>
                    <select
                      value={allGroups.some(g => g.name === newGrado) ? newGrado : ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val) {
                          setNewGrado(val);
                          const cfg = getAcademicGroupConfig(val);
                          if (cfg) setNewDepartamento(cfg.programName);
                        }
                      }}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-emerald-600 bg-white mb-2"
                    >
                      <option value="">-- Seleccionar Curso Oficial --</option>
                      <optgroup label="🩺 Técnico Auxiliar en Enfermería (TAE)">
                        {allGroups.filter(g => g.programCode === 'TAE').map(g => (
                          <option key={g.name} value={g.name}>{g.name} ({g.shift} {g.calendar === 'CB' ? '• Calendario B' : ''})</option>
                        ))}
                      </optgroup>
                      <optgroup label="👶 Atención a la Primera Infancia (AIPI)">
                        {allGroups.filter(g => g.programCode === 'AIPI').map(g => (
                          <option key={g.name} value={g.name}>{g.name} ({g.shift})</option>
                        ))}
                      </optgroup>
                      <optgroup label="🎒 Técnico Auxiliar en Preescolar">
                        {allGroups.filter(g => g.programCode === 'PREESCOLAR').map(g => (
                          <option key={g.name} value={g.name}>{g.name} ({g.shift})</option>
                        ))}
                      </optgroup>
                      {allGroups.filter(g => !['TAE', 'AIPI', 'PREESCOLAR'].includes(g.programCode)).length > 0 && (
                        <optgroup label="Otros Cursos Institucionales">
                          {allGroups.filter(g => !['TAE', 'AIPI', 'PREESCOLAR'].includes(g.programCode)).map(g => (
                            <option key={g.name} value={g.name}>{g.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <input 
                      type="text" 
                      value={newGrado}
                      onChange={e => setNewGrado(e.target.value)}
                      placeholder="O escribe el curso personalizado..."
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg font-bold text-[11px] uppercase outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Programa / Carrera:</label>
                    <input 
                      type="text" 
                      value={newDepartamento}
                      onChange={e => setNewDepartamento(e.target.value)}
                      placeholder="Ej: Enfermería TAE"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Sede Institucional:</label>
                    <select
                      value={newSede}
                      onChange={e => setNewSede(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value={1}>Sede Principal Soacha (Centro)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Inicio de Prácticas (Opcional):</label>
                    <input 
                      type="date" 
                      value={newInicioPracticas}
                      onChange={e => setNewInicioPracticas(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Contacto y Residencia (Para Asistencias) */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <Phone size={16} className="text-blue-600" />
                  <h4 className="text-xs font-black uppercase text-blue-800 tracking-wider">3. Contacto y Seguimiento de Inasistencias</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Teléfono / Celular de Contacto:</label>
                    <input 
                      type="tel" 
                      value={newTelefono}
                      onChange={e => setNewTelefono(e.target.value)}
                      placeholder="Ej: 3101234567"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Correo Electrónico:</label>
                    <input 
                      type="email" 
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="Ej: estudiante@ejemplo.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-12">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Dirección de Domicilio / Residencia:</label>
                    <input 
                      type="text" 
                      value={newDomicilio}
                      onChange={e => setNewDomicilio(e.target.value)}
                      placeholder="Ej: Calle 13 # 7-45 Soacha Centro"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-xs uppercase outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 4: Control de Acceso y Tarjeta RFID */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <CreditCard size={16} className="text-purple-600" />
                  <h4 className="text-xs font-black uppercase text-purple-800 tracking-wider">4. Control de Acceso, Torniquetes y Tarjeta RFID</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Número de Tarjeta Física (Plástico):</label>
                    <input 
                      type="text" 
                      value={newTarjetaNumero}
                      onChange={e => setNewTarjetaNumero(e.target.value)}
                      placeholder="Ej: 3056834 (Impreso en la tarjeta)"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-purple-600 bg-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-black uppercase text-gray-500">UID Chip RFID / NFC:</label>
                      {pendingUid && (
                        <button
                          type="button"
                          onClick={() => setNewUid(pendingUid)}
                          className="text-[9px] font-black text-purple-700 hover:text-purple-900 uppercase underline"
                        >
                          Usar {pendingUid}
                        </button>
                      )}
                    </div>
                    <input 
                      type="text" 
                      value={newUid}
                      onChange={e => setNewUid(e.target.value.toUpperCase())}
                      placeholder="Ej: 5400357EAC"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-purple-600 bg-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-12 pt-2">
                    <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newActivo}
                        onChange={e => setNewActivo(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-fsm-blue focus:ring-fsm-blue"
                      />
                      <span className="text-xs font-bold uppercase text-gray-800">
                        Estudiante Activo en la Institución (Habilitado para ingreso y planilla)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
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
                className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
              >
                <Plus size={16} /> {isCreating ? 'Creando y Matriculando...' : 'Crear y Matricular Estudiante'}
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
                <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight mt-0.5">CAMBIAR GRADO/CURSO O CARRERA</h3>
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
                Se cambiará el curso o carrera a los <strong className="text-purple-700">{selectedStudentIds.length} estudiantes seleccionados</strong>.
              </p>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Nuevo Curso / Carrera / Turno de Destino:
                </label>
                <select
                  value={allGroups.some(g => g.name === newBulkGrado) ? newBulkGrado : ''}
                  onChange={e => {
                    if (e.target.value) setNewBulkGrado(e.target.value);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-purple-600 bg-white mb-2"
                >
                  <option value="">-- Seleccionar curso / carrera oficial --</option>
                  <optgroup label="🩺 Técnico Auxiliar en Enfermería (TAE)">
                    {allGroups.filter(g => g.programCode === 'TAE').map(g => (
                      <option key={g.name} value={g.name}>{g.name} ({g.shift} {g.calendar === 'CB' ? '• Calendario B' : ''})</option>
                    ))}
                  </optgroup>
                  <optgroup label="👶 Primera Infancia (AIPI)">
                    {allGroups.filter(g => g.programCode === 'AIPI').map(g => (
                      <option key={g.name} value={g.name}>{g.name} ({g.shift})</option>
                    ))}
                  </optgroup>
                  <optgroup label="🎒 Técnico Auxiliar en Preescolar">
                    {allGroups.filter(g => g.programCode === 'PREESCOLAR').map(g => (
                      <option key={g.name} value={g.name}>{g.name} ({g.shift})</option>
                    ))}
                  </optgroup>
                  {allGroups.filter(g => !['TAE', 'AIPI', 'PREESCOLAR'].includes(g.programCode)).length > 0 && (
                    <optgroup label="Otros Cursos Institucionales">
                      {allGroups.filter(g => !['TAE', 'AIPI', 'PREESCOLAR'].includes(g.programCode)).map(g => (
                        <option key={g.name} value={g.name}>{g.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <input 
                  type="text" 
                  placeholder="O escribe manualmente aquí..."
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

      {/* Modal para Crear Nuevo Curso Oficial */}
      <CreateGroupModal
        isOpen={createGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
        onSuccess={(res) => {
          setNewGrado(res.groupName);
          setEditGrado(res.groupName);
          showStatus(`✓ Curso ${res.groupName} creado y listo.`);
          router.refresh();
        }}
      />
    </div>
  );
}


