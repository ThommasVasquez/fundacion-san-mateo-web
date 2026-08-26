"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';
import { 
  createIssuedDocument, updateIssuedDocument, toggleDocumentStatus, deleteIssuedDocument 
} from '@/app/actions';
import { 
  FileCheck, Search, Plus, QrCode, Edit2, Trash2, X, Save, 
  CheckCircle2, XCircle, Download, ExternalLink, ShieldCheck, Printer, FileText
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

interface DocumentManagerClientProps {
  documents: DocumentItem[];
  nextConsecutivo: string;
}

export default function DocumentManagerClient({ documents, nextConsecutivo }: DocumentManagerClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Modal: Create New Document
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newConsecutivo, setNewConsecutivo] = useState(nextConsecutivo);
  const [newNombre, setNewNombre] = useState('');
  const [newDocumento, setNewDocumento] = useState('');
  const [newTipo, setNewTipo] = useState('Certificado de Estudio');
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
        ? `¿Estás seguro de que deseas ANULAR el documento consecutivo ${doc.consecutivo}? Al escanear el QR o verificarlo en la web, se advertirá que el documento fue ANULADO.`
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
      message: `¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE el registro ${doc.consecutivo} (${doc.student_nombre})? Esta acción borrará el expediente.`,
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
    'Certificado de Estudio',
    'Certificado de Notas',
    'Diploma',
    'Constancia de Asistencia',
    'Acta de Grado',
    'Certificado de Horas Prácticas'
  ];

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
        <button
          onClick={() => {
            setNewConsecutivo(nextConsecutivo);
            setCreateModalOpen(true);
          }}
          className="px-6 py-3 bg-fsm-blue text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md flex items-center gap-2"
        >
          <Plus size={18} /> Expedir Nuevo Documento
        </button>

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
                  const verificationUrl = `https://fundacionsanmateosoacha.edu.co/verificar/${encodeURIComponent(doc.consecutivo)}`;
                  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verificationUrl)}`;

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
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => setQrModalDoc(doc)}
                          className="px-3 py-1.5 bg-fsm-blue/5 text-fsm-blue border border-fsm-blue/10 hover:bg-fsm-blue hover:text-white transition-all text-xs font-bold rounded-xl inline-flex items-center gap-1"
                          title="Ver y descargar Código QR para hoja membrete"
                        >
                          <QrCode size={14} /> Ver QR
                        </button>
                        <button
                          onClick={() => handleToggleState(doc)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border ${
                            isValido 
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' 
                              : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
                          }`}
                        >
                          {isValido ? 'Anular' : 'Activar'}
                        </button>
                        <button
                          onClick={() => openEditModal(doc)}
                          className="p-1.5 text-gray-400 hover:text-fsm-blue transition-colors rounded-lg hover:bg-gray-100 inline-block"
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
                  placeholder="Ej: TÉCNICO EN ENFERMERÍA / CURSO PRIMEROS AUXILIOS"
                  value={newPrograma}
                  onChange={e => setNewPrograma(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-fsm-blue"
                />
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
                  placeholder="Información interna adicional sobre la expedición del certificado..."
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

      {/* Modal 2: QR Viewer & Print Modal */}
      {qrModalDoc && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-fsm-blue uppercase tracking-widest">CÓDIGO QR OFICIAL</span>
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
              <p className="text-xs font-semibold text-gray-600">
                Imprime o pega este código QR en la <strong>hoja membrete</strong>. Al ser escaneado con cualquier celular, redirigirá al certificado de autenticidad institucional.
              </p>

              {/* QR Image Box */}
              <div className="p-4 bg-white rounded-2xl border-2 border-fsm-blue/20 shadow-md inline-block relative">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://fundacionsanmateosoacha.edu.co/verificar/${encodeURIComponent(qrModalDoc.consecutivo)}`)}`}
                  alt={`QR ${qrModalDoc.consecutivo}`}
                  className="w-56 h-56 object-contain"
                />
              </div>

              <div className="text-[11px] font-mono text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg w-full truncate border border-gray-100">
                https://fundacionsanmateosoacha.edu.co/verificar/{qrModalDoc.consecutivo}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`https://fundacionsanmateosoacha.edu.co/verificar/${encodeURIComponent(qrModalDoc.consecutivo)}`)}`}
                target="_blank"
                download={`QR_${qrModalDoc.consecutivo}.png`}
                className="flex-1 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Download size={14} /> Descargar PNG
              </a>

              <Link
                href={`/verificar/${encodeURIComponent(qrModalDoc.consecutivo)}`}
                target="_blank"
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={14} /> Probar Enlace
              </Link>
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
                  onChange={e => setEditNombre(e.target.value)}
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
