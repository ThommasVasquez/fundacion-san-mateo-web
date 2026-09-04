"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';
import { 
  createIssuedDocument, updateIssuedDocument, toggleDocumentStatus, deleteIssuedDocument 
} from '@/app/actions';
import { generateDocumentPDF } from '@/lib/documentPdfGenerator';
import { exportDocumentsToExcel } from '@/lib/excelExportHelper';
import { 
  FileCheck, Search, Plus, QrCode, Edit2, Trash2, X, Save, 
  CheckCircle2, XCircle, Download, ExternalLink, ShieldCheck, Printer, 
  FileText, Copy, Check, FileSpreadsheet, User, BookOpen, Award
} from 'lucide-react';
import Link from 'next/link';

interface DocumentItem {
  id: string;
  consecutivo: string;
  student_nombre: string;
  student_documento: string;
  tipo_documento: string;
  programa_curso: string;
  fecha_expedicion: string;
  folio: string;
  libro: string;
  estado: string;
  notas: string;
  pdf_url: string;
  created_at: string;
}

interface StudentOption {
  nombre: string;
  documento: string;
  programa: string;
}

interface DocumentManagerClientProps {
  documents: DocumentItem[];
  nextConsecutivo: string;
  registeredStudents?: StudentOption[];
  academicPrograms?: string[];
}

export default function DocumentManagerClient({ 
  documents, 
  nextConsecutivo,
  registeredStudents = [],
  academicPrograms = []
}: DocumentManagerClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isGeneratingPdfId, setIsGeneratingPdfId] = useState<string | null>(null);

  // Student autocomplete suggestions
  const [studentQuery, setStudentQuery] = useState('');
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);

  // Modal: Create New Document
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newConsecutivo, setNewConsecutivo] = useState(nextConsecutivo);
  const [newNombre, setNewNombre] = useState('');
  const [newDocumento, setNewDocumento] = useState('');
  const [newTipo, setNewTipo] = useState('Diploma de Grado');
  const [newPrograma, setNewPrograma] = useState('');
  const [newFecha, setNewFecha] = useState(new Date().toISOString().split('T')[0]);
  const [newFolio, setNewFolio] = useState('');
  const [newLibro, setNewLibro] = useState('');
  const [newNotas, setNewNotas] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal: Edit Document
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [editConsecutivo, setEditConsecutivo] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editDocumento, setEditDocumento] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editPrograma, setEditPrograma] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editFolio, setEditFolio] = useState('');
  const [editLibro, setEditLibro] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal: QR Viewer
  const [qrModalDoc, setQrModalDoc] = useState<DocumentItem | null>(null);

  // Custom FSM Confirmation Dialog State
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

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 5000);
  };

  const handleSelectRegisteredStudent = (s: StudentOption) => {
    setNewNombre(s.nombre);
    if (s.documento) setNewDocumento(s.documento);
    if (s.programa && !newPrograma) setNewPrograma(s.programa);
    setShowStudentSuggestions(false);
    setStudentQuery('');
  };

  const handleCreateDocument = async () => {
    if (!newNombre.trim() || !newTipo.trim() || !newPrograma.trim()) {
      showStatus('Nombre del Estudiante, Tipo de Documento y Programa son obligatorios.', 'error');
      return;
    }

    setIsCreating(true);
    const res = await createIssuedDocument({
      consecutivo: newConsecutivo,
      student_nombre: newNombre,
      student_documento: newDocumento,
      tipo_documento: newTipo,
      programa_curso: newPrograma,
      fecha_expedicion: newFecha,
      folio: newFolio,
      libro: newLibro,
      notas: newNotas,
    });

    setIsCreating(false);
    if (res.success) {
      showStatus(`Documento consecutivo ${res.consecutivo} expedido con éxito.`);
      setCreateModalOpen(false);
      setNewNombre('');
      setNewDocumento('');
      setNewPrograma('');
      setNewFolio('');
      setNewLibro('');
      setNewNotas('');
      router.refresh();
    } else {
      showStatus(res.error || 'Error al expedir documento', 'error');
    }
  };

  const openEditModal = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setEditConsecutivo(doc.consecutivo);
    setEditNombre(doc.student_nombre);
    setEditDocumento(doc.student_documento);
    setEditTipo(doc.tipo_documento);
    setEditPrograma(doc.programa_curso);
    setEditFecha(doc.fecha_expedicion);
    setEditFolio(doc.folio);
    setEditLibro(doc.libro);
    setEditNotas(doc.notas);
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    setIsSavingEdit(true);

    const res = await updateIssuedDocument(editingDoc.id, {
      consecutivo: editConsecutivo,
      student_nombre: editNombre,
      student_documento: editDocumento,
      tipo_documento: editTipo,
      programa_curso: editPrograma,
      fecha_expedicion: editFecha,
      folio: editFolio,
      libro: editLibro,
      notas: editNotas,
    });

    setIsSavingEdit(false);
    if (res.success) {
      showStatus(`Documento ${editConsecutivo} actualizado con éxito.`);
      setEditingDoc(null);
      router.refresh();
    } else {
      showStatus(res.error || 'Error al actualizar documento', 'error');
    }
  };

  const handleToggleState = (doc: DocumentItem) => {
    const isValido = doc.estado === 'valido';
    const newEstado = isValido ? 'anulado' : 'valido';

    setConfirmDialog({
      isOpen: true,
      title: isValido ? 'ANULAR DOCUMENTO' : 'RECOBRAR VALIDEZ DE DOCUMENTO',
      subtitle: `${doc.consecutivo} - ${doc.student_nombre}`,
      message: isValido
        ? `¿Estás seguro de que deseas ANULAR el documento consecutivo ${doc.consecutivo}? Al escanear el QR o verificarlo en la web pública, se alertará que el documento fue ANULADO.`
        : `¿Estás seguro de reactivar la validez oficial del documento consecutivo ${doc.consecutivo}?`,
      confirmBtnText: isValido ? 'Sí, Anular Documento' : 'Sí, Activar Documento',
      confirmBtnClass: isValido ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white',
      badgeText: isValido ? 'ALERTA DE ANULACIÓN' : 'REACTIVACIÓN',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await toggleDocumentStatus(doc.id, newEstado);
        if (res.success) {
          showStatus(`Documento ${doc.consecutivo} marcado como ${newEstado.toUpperCase()}.`);
          router.refresh();
        } else {
          showStatus(res.error || 'Error al cambiar estado', 'error');
        }
      }
    });
  };

  const handleDelete = (doc: DocumentItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'ELIMINAR REGISTRO DOCUMENTAL',
      subtitle: doc.consecutivo,
      message: `¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE el registro ${doc.consecutivo} (${doc.student_nombre})? Esta acción borrará el expediente institucional.`,
      confirmBtnText: 'Sí, Eliminar Registro',
      confirmBtnClass: 'bg-red-700 hover:bg-red-800 text-white',
      badgeText: 'BORRADO PERMANENTE',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteIssuedDocument(doc.id);
        if (res.success) {
          showStatus(`Registro ${doc.consecutivo} eliminado.`);
          setEditingDoc(null);
          router.refresh();
        } else {
          showStatus(res.error || 'Error al eliminar', 'error');
        }
      }
    });
  };

  // Download official PDF for document
  const handleDownloadPDF = async (doc: DocumentItem) => {
    try {
      setIsGeneratingPdfId(doc.id);
      await generateDocumentPDF({
        consecutivo: doc.consecutivo,
        student_nombre: doc.student_nombre,
        student_documento: doc.student_documento,
        tipo_documento: doc.tipo_documento,
        programa_curso: doc.programa_curso,
        fecha_expedicion: doc.fecha_expedicion,
        folio: doc.folio,
        libro: doc.libro,
        estado: doc.estado,
        notas: doc.notas,
      });
      showStatus(`PDF Oficial de ${doc.consecutivo} descargado exitosamente.`);
    } catch (e: any) {
      console.error('Error generating PDF:', e);
      showStatus('Error al generar el PDF del documento.', 'error');
    } finally {
      setIsGeneratingPdfId(null);
    }
  };

  // Copy Verification Link
  const handleCopyLink = (consecutivo: string) => {
    const url = `https://fundacionsanmateosoacha.edu.co/verificar/${encodeURIComponent(consecutivo)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Export to Excel with Institutional Styling
  const handleExportExcel = async () => {
    if (filteredDocs.length === 0) {
      showStatus('No hay documentos para exportar.', 'error');
      return;
    }

    try {
      setIsExportingExcel(true);
      const dataToExport = filteredDocs.map(d => ({
        consecutivo: d.consecutivo,
        student_nombre: d.student_nombre,
        student_documento: d.student_documento || 'S/D',
        tipo_documento: d.tipo_documento,
        programa_curso: d.programa_curso,
        fecha_expedicion: formatDateDDMMYYYY(d.fecha_expedicion),
        folio: d.folio || '',
        libro: d.libro || '',
        estado: d.estado,
        notas: d.notas || '',
        verification_url: `https://fundacionsanmateosoacha.edu.co/verificar/${d.consecutivo}`
      }));

      await exportDocumentsToExcel(dataToExport);
      showStatus('Reporte Excel institucional generado exitosamente.');
    } catch (e) {
      console.error('Error exporting Excel:', e);
      showStatus('Error al generar archivo Excel.', 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Filter documents
  const filteredDocs = documents.filter(d => {
    const term = search.toLowerCase();
    const matchesSearch = d.consecutivo.toLowerCase().includes(term) ||
                          d.student_nombre.toLowerCase().includes(term) ||
                          d.student_documento.toLowerCase().includes(term) ||
                          d.programa_curso.toLowerCase().includes(term);
    const matchesTipo = !filterTipo || d.tipo_documento === filterTipo;
    const matchesEstado = filterEstado === 'all' || d.estado === filterEstado;
    return matchesSearch && matchesTipo && matchesEstado;
  });

  const documentTypes = [
    'Diploma de Grado',
    'Acta de Grado',
    'Certificado de Estudio',
    'Certificado de Calificaciones',
    'Constancia de Asistencia',
    'Certificado de Horas Prácticas',
    'Certificación de Competencias Laborales'
  ];

  // Filtered student suggestions for autocomplete
  const filteredStudents = registeredStudents.filter(s => {
    if (!studentQuery.trim()) return false;
    const q = studentQuery.toLowerCase();
    return s.nombre.toLowerCase().includes(q) || s.documento.toLowerCase().includes(q);
  }).slice(0, 8);

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

      {/* Action Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setNewConsecutivo(nextConsecutivo);
              setCreateModalOpen(true);
            }}
            className="px-6 py-3 bg-fsm-blue text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md flex items-center gap-2 active:scale-95"
          >
            <Plus size={18} /> Expedir Nuevo Documento
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel || filteredDocs.length === 0}
            className="px-5 py-3 bg-emerald-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-800 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 active:scale-95"
          >
            <FileSpreadsheet size={16} /> {isExportingExcel ? 'Exportando...' : 'Exportar a Excel'}
          </button>
        </div>

        <Link
          href="/verificar"
          target="_blank"
          className="px-5 py-2.5 bg-white text-fsm-blue border border-fsm-blue/20 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-blue hover:text-white transition-all shadow-sm flex items-center gap-2"
        >
          <ExternalLink size={14} /> Abrir Portal de Verificación Pública
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full md:w-80">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar consecutivo, estudiante o CC..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent font-bold text-xs text-gray-700 outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full md:w-56">
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value)}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none w-full"
            >
              <option value="">Todos los Tipos de Documento</option>
              {documentTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full md:w-44">
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none w-full"
            >
              <option value="all">Todos los Estados</option>
              <option value="valido">Solo Válidos</option>
              <option value="anulado">Solo Anulados</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-black text-gray-500 uppercase tracking-widest">
          Documentos: {filteredDocs.length} / {documents.length}
        </div>
      </div>

      {/* Document List Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                <th className="py-4 px-6">Consecutivo</th>
                <th className="py-4 px-6">Estudiante & Identificación</th>
                <th className="py-4 px-6">Tipo de Documento</th>
                <th className="py-4 px-6">Programa / Curso</th>
                <th className="py-4 px-6">Expedición</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No se encontraron documentos emitidos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredDocs.map(doc => {
                  const isValido = doc.estado === 'valido';
                  const isDownloading = isGeneratingPdfId === doc.id;

                  return (
                    <tr key={doc.id} className={`hover:bg-gray-50/50 transition-colors ${!isValido ? 'bg-red-50/30' : ''}`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-fsm-blue bg-fsm-blue/5 px-2.5 py-1 rounded-lg">
                            {doc.consecutivo}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-black text-fsm-blue uppercase">{doc.student_nombre}</div>
                        {doc.student_documento && (
                          <div className="text-[10px] font-bold text-gray-400">CC/TI: {doc.student_documento}</div>
                        )}
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-800">
                        {doc.tipo_documento}
                      </td>
                      <td className="py-4 px-6 uppercase text-gray-600 font-bold">
                        {doc.programa_curso}
                      </td>
                      <td className="py-4 px-6 text-gray-500 font-medium">
                        {formatDateDDMMYYYY(doc.fecha_expedicion)}
                        {(doc.folio || doc.libro) && (
                          <div className="text-[9px] text-gray-400 uppercase">
                            {doc.folio ? `Folio: ${doc.folio}` : ''} {doc.libro ? `| Libro: ${doc.libro}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {isValido ? (
                          <span className="text-[9px] font-black text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
                            <CheckCircle2 size={12} /> VÁLIDO
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-fsm-red bg-red-50 border border-red-200 px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
                            <XCircle size={12} /> ANULADO
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                        {/* Download PDF Button */}
                        <button
                          onClick={() => handleDownloadPDF(doc)}
                          disabled={isDownloading}
                          className="px-2.5 py-1.5 bg-fsm-blue text-white hover:bg-fsm-red transition-all text-xs font-bold rounded-xl inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
                          title="Descargar PDF Oficial con QR membretado"
                        >
                          <Download size={13} /> {isDownloading ? 'Generando...' : 'PDF'}
                        </button>

                        {/* View QR Modal */}
                        <button
                          onClick={() => setQrModalDoc(doc)}
                          className="px-2.5 py-1.5 bg-fsm-blue/5 text-fsm-blue border border-fsm-blue/10 hover:bg-fsm-blue hover:text-white transition-all text-xs font-bold rounded-xl inline-flex items-center gap-1"
                          title="Ver Código QR y enlace de verificación"
                        >
                          <QrCode size={13} /> QR
                        </button>

                        {/* Toggle Status Button */}
                        <button
                          onClick={() => handleToggleState(doc)}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all border ${
                            isValido 
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' 
                              : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
                          }`}
                        >
                          {isValido ? 'Anular' : 'Activar'}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(doc)}
                          className="p-1.5 text-gray-400 hover:text-fsm-blue transition-colors rounded-lg hover:bg-gray-100 inline-block align-middle"
                          title="Editar Registro"
                        >
                          <Edit2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Expedir Nuevo Documento */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-lg p-8 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest">NUEVO REGISTRO DOCUMENTAL</span>
                <h3 className="text-xl font-black text-fsm-blue uppercase leading-tight mt-0.5">EXPEDIR DOCUMENTO OFICIAL</h3>
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
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Código Consecutivo:*</label>
                <input 
                  type="text" 
                  value={newConsecutivo}
                  onChange={e => setNewConsecutivo(e.target.value.toUpperCase())}
                  placeholder="Ej: FSM-2026-00001"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
              </div>

              {/* Autocomplete / Fast Selector from Registered Students */}
              {registeredStudents.length > 0 && (
                <div className="relative">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                    Cargar desde Alumnos Matriculados (Opcional):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por nombre o cédula de alumno matriculado..."
                      value={studentQuery}
                      onChange={e => {
                        setStudentQuery(e.target.value);
                        setShowStudentSuggestions(true);
                      }}
                      onFocus={() => setShowStudentSuggestions(true)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-fsm-blue"
                    />
                    {studentQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentQuery('');
                          setShowStudentSuggestions(false);
                        }}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {showStudentSuggestions && filteredStudents.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {filteredStudents.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectRegisteredStudent(s)}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50/50 flex flex-col transition-colors"
                        >
                          <span className="font-bold text-xs text-fsm-blue uppercase">{s.nombre}</span>
                          <span className="text-[10px] text-gray-500">
                            {s.documento ? `CC/TI: ${s.documento} ` : ''} {s.programa ? `| ${s.programa}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Nombre Completo del Estudiante:*</label>
                <input 
                  type="text" 
                  placeholder="Ej: JUAN CARLOS PÉREZ GÓMEZ"
                  value={newNombre}
                  onChange={e => setNewNombre(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Documento Identidad (Cédula/TI):</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 1.018.452.930"
                    value={newDocumento}
                    onChange={e => setNewDocumento(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-fsm-blue"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Tipo de Documento:*</label>
                  <select
                    value={newTipo}
                    onChange={e => setNewTipo(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                  >
                    {documentTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Programa / Curso / Certificación:*</label>
                <input 
                  type="text" 
                  list="academicProgramsList"
                  placeholder="Ej: TÉCNICO EN ENFERMERÍA / AUXILIAR EN ENFERMERÍA"
                  value={newPrograma}
                  onChange={e => setNewPrograma(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
                <datalist id="academicProgramsList">
                  {academicPrograms.map((p, idx) => (
                    <option key={idx} value={p} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Fecha Expedición:</label>
                  <input 
                    type="date" 
                    value={newFecha}
                    onChange={e => setNewFecha(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-fsm-blue"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Folio (Opcional):</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 045"
                    value={newFolio}
                    onChange={e => setNewFolio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Libro (Opcional):</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 012"
                    value={newLibro}
                    onChange={e => setNewLibro(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Observaciones / Notas Internas:</label>
                <textarea 
                  placeholder="Información adicional sobre la expedición del diploma o certificado..."
                  value={newNotas}
                  onChange={e => setNewNotas(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-fsm-blue h-20"
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
                onClick={handleCreateDocument}
                disabled={isCreating}
                className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} /> {isCreating ? 'Guardando...' : 'Expedir Documento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: QR Viewer & Actions Modal */}
      {qrModalDoc && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest">CÓDIGO QR Y VERIFICACIÓN</span>
                <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight mt-0.5">{qrModalDoc.consecutivo}</h3>
              </div>
              <button 
                onClick={() => setQrModalDoc(null)}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 flex flex-col items-center">
              <div className="text-xs font-bold text-gray-800 uppercase">{qrModalDoc.student_nombre}</div>
              <p className="text-[11px] font-medium text-gray-600">
                Al escanear este código QR con cualquier dispositivo móvil, se abrirá instantáneamente la verificación oficial en la plataforma.
              </p>

              {/* QR Image Box */}
              <div className="p-4 bg-white rounded-2xl border-2 border-fsm-blue/20 shadow-md inline-block relative">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://fundacionsanmateosoacha.edu.co/verificar/${encodeURIComponent(qrModalDoc.consecutivo)}`)}`}
                  alt={`QR ${qrModalDoc.consecutivo}`}
                  className="w-52 h-52 object-contain"
                />
              </div>

              {/* Copy URL Box */}
              <div className="flex items-center gap-2 w-full bg-gray-50 p-2 rounded-xl border border-gray-200">
                <input
                  type="text"
                  readOnly
                  value={`https://fundacionsanmateosoacha.edu.co/verificar/${qrModalDoc.consecutivo}`}
                  className="bg-transparent font-mono text-[11px] text-gray-600 outline-none w-full px-2"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(qrModalDoc.consecutivo)}
                  className="p-2 bg-fsm-blue text-white rounded-lg hover:bg-fsm-red transition-colors shrink-0"
                  title="Copiar enlace"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleDownloadPDF(qrModalDoc)}
                className="w-full py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Download size={14} /> Descargar Certificado PDF Oficial
              </button>

              <div className="flex gap-2">
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(`https://fundacionsanmateosoacha.edu.co/verificar/${encodeURIComponent(qrModalDoc.consecutivo)}`)}`}
                  target="_blank"
                  download={`QR_${qrModalDoc.consecutivo}.png`}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <QrCode size={13} /> PNG Alta Resolución
                </a>

                <Link
                  href={`/verificar/${encodeURIComponent(qrModalDoc.consecutivo)}`}
                  target="_blank"
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={13} /> Ver Página Pública
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Document Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-lg p-8 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest">EDITAR DOCUMENTO</span>
                <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight mt-0.5">{editingDoc.consecutivo}</h3>
              </div>
              <button 
                onClick={() => setEditingDoc(null)}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Código Consecutivo:</label>
                <input 
                  type="text" 
                  value={editConsecutivo}
                  onChange={e => setEditConsecutivo(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Nombre Completo del Estudiante:</label>
                <input 
                  type="text" 
                  value={editNombre}
                  onChange={e => setNewNombre(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Documento Identidad:</label>
                  <input 
                    type="text" 
                    value={editDocumento}
                    onChange={e => setEditDocumento(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-fsm-blue"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Tipo de Documento:</label>
                  <select
                    value={editTipo}
                    onChange={e => setEditTipo(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                  >
                    {documentTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Programa / Curso:</label>
                <input 
                  type="text" 
                  value={editPrograma}
                  onChange={e => setEditPrograma(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Fecha Expedición:</label>
                  <input 
                    type="date" 
                    value={editFecha}
                    onChange={e => setEditFecha(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-fsm-blue"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Folio:</label>
                  <input 
                    type="text" 
                    value={editFolio}
                    onChange={e => setEditFolio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Libro:</label>
                  <input 
                    type="text" 
                    value={editLibro}
                    onChange={e => setEditLibro(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Observaciones / Notas:</label>
                <textarea 
                  value={editNotas}
                  onChange={e => setEditNotas(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:border-fsm-blue h-20"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleDelete(editingDoc)}
                className="px-4 py-2 bg-red-50 text-fsm-red hover:bg-fsm-red hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1"
              >
                <Trash2 size={14} /> Eliminar
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
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
                  <Save size={14} /> {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
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
