"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';
import { 
  createIssuedDocument, updateIssuedDocument, toggleDocumentStatus, deleteIssuedDocument,
  bulkCreateIssuedDocuments 
} from '@/app/actions';
import { generateDocumentPDF } from '@/lib/documentPdfGenerator';
import { stampOfficialDocumentPDF, uint8ArrayToDataUrl } from '@/lib/pdfStamper';
import { extractStudentInfoFromPDF } from '@/lib/pdfTextExtractor';
import { exportDocumentsToExcel, exportBulkImportTemplateExcel } from '@/lib/excelExportHelper';
import { 
  FileCheck, Search, Plus, QrCode, Edit2, Trash2, X, Save, 
  CheckCircle2, XCircle, Download, ExternalLink, ShieldCheck, Printer, 
  FileText, Copy, Check, FileSpreadsheet, User, BookOpen, Award,
  UploadCloud, FileUp, AlertTriangle, RefreshCw, File, Eye, Sparkles, AlertCircle
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

interface ParsedBulkItem {
  consecutivo?: string;
  student_nombre: string;
  student_documento?: string;
  tipo_documento: string;
  programa_curso: string;
  fecha_expedicion?: string;
  folio?: string;
  libro?: string;
  notas?: string;
  isValid: boolean;
  validationError?: string;
}

interface DocumentManagerClientProps {
  documents: DocumentItem[];
  nextConsecutivo: string;
  registeredStudents?: StudentOption[];
  academicPrograms?: string[];
  isSuperAdmin?: boolean;
}

export default function DocumentManagerClient({ 
  documents, 
  nextConsecutivo,
  registeredStudents = [],
  academicPrograms = [],
  isSuperAdmin = false
}: DocumentManagerClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const createPdfInputRef = useRef<HTMLInputElement>(null);
  const editPdfInputRef = useRef<HTMLInputElement>(null);

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
  const [newTipo, setNewTipo] = useState(isSuperAdmin ? 'Diploma de Grado' : 'Certificado de Notas');
  const [newPrograma, setNewPrograma] = useState('');
  const [newFecha, setNewFecha] = useState(new Date().toISOString().split('T')[0]);
  const [newFolio, setNewFolio] = useState('');
  const [newLibro, setNewLibro] = useState('');
  const [newNotas, setNewNotas] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Single PDF upload for Expedir Documento
  const [attachedPdfFile, setAttachedPdfFile] = useState<File | null>(null);
  const [isDetectingPdf, setIsDetectingPdf] = useState(false);
  const [pdfAutoDetectedMsg, setPdfAutoDetectedMsg] = useState('');
  const [isStampingPreview, setIsStampingPreview] = useState(false);
  const [previewPdfModal, setPreviewPdfModal] = useState<{ isOpen: boolean; url: string; title: string; consecutivo?: string }>({
    isOpen: false,
    url: '',
    title: '',
    consecutivo: ''
  });

  // Modal: Bulk Upload
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTab, setBulkTab] = useState<'excel' | 'pdf'>('excel');
  const [parsedRows, setParsedRows] = useState<ParsedBulkItem[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<{ file: File; studentName: string; docType: string; program: string }[]>([]);

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
  const [editAttachedPdfFile, setEditAttachedPdfFile] = useState<File | null>(null);
  const [editPdfUrl, setEditPdfUrl] = useState('');
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
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 6000);
  };

  const handleSelectRegisteredStudent = (s: StudentOption) => {
    setNewNombre(s.nombre);
    if (s.documento) setNewDocumento(s.documento);
    if (s.programa && !newPrograma) setNewPrograma(s.programa);
    setShowStudentSuggestions(false);
    setStudentQuery('');
  };

  // Handler for Single PDF selection in Expedir Documento
  const handleSelectCreatePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showStatus('Por favor selecciona un archivo en formato PDF (.pdf)', 'error');
      return;
    }

    setAttachedPdfFile(file);
    setIsDetectingPdf(true);
    setPdfAutoDetectedMsg('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const extracted = await extractStudentInfoFromPDF(arrayBuffer);

      let detectedFields: string[] = [];

      if (extracted.studentNombre && !newNombre) {
        setNewNombre(extracted.studentNombre);
        detectedFields.push('Nombre');
      }
      if (extracted.studentDocumento && !newDocumento) {
        setNewDocumento(extracted.studentDocumento);
        detectedFields.push('Documento');
      }
      if (extracted.programaCurso && !newPrograma) {
        setNewPrograma(extracted.programaCurso);
        detectedFields.push('Programa');
      }
      if (extracted.tipoDocumento) {
        const isRestricted = /diploma|acta/i.test(extracted.tipoDocumento) && !isSuperAdmin;
        if (isRestricted) {
          setPdfAutoDetectedMsg('⚠️ Documento identificado como Diploma/Acta de Grado. Solo admin@fundacionsanmateo.edu.co tiene autorización para expedirlo.');
          showStatus('Permiso denegado: Solo admin@fundacionsanmateo.edu.co puede subir Diplomas y Actas.', 'error');
        } else {
          setNewTipo(extracted.tipoDocumento);
          detectedFields.push('Tipo');
        }
      }

      if (detectedFields.length > 0) {
        setPdfAutoDetectedMsg(`Detectado automáticamente del PDF: ${detectedFields.join(', ')}.`);
        showStatus(`Datos detectados del PDF: ${detectedFields.join(', ')}.`);
      } else {
        showStatus('PDF adjunto. Se estampará marca de agua, logo y consecutivo.');
      }
    } catch (err) {
      console.warn('Could not parse PDF text:', err);
    } finally {
      setIsDetectingPdf(false);
    }
  };

  // Live preview of stamped PDF
  const handlePreviewStampedPdf = async (fileToPreview?: File | null) => {
    const targetFile = fileToPreview || attachedPdfFile || editAttachedPdfFile;
    if (!targetFile) {
      showStatus('No hay ningún archivo PDF seleccionado para previsualizar.', 'error');
      return;
    }

    setIsStampingPreview(true);
    try {
      const arrayBuffer = await targetFile.arrayBuffer();
      const stampedBytes = await stampOfficialDocumentPDF(arrayBuffer, {
        consecutivo: editingDoc ? editConsecutivo : newConsecutivo,
        studentNombre: editingDoc ? editNombre : newNombre,
        studentDocumento: editingDoc ? editDocumento : newDocumento,
        tipoDocumento: editingDoc ? editTipo : newTipo,
        programaCurso: editingDoc ? editPrograma : newPrograma,
        fechaExpedicion: editingDoc ? editFecha : newFecha,
      });

      const blob = new Blob([stampedBytes as any], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      const targetConsecutivo = editingDoc ? editConsecutivo : newConsecutivo;
      setPreviewPdfModal({
        isOpen: true,
        url: blobUrl,
        title: `Vista Previa Oficial: ${targetConsecutivo}`,
        consecutivo: targetConsecutivo
      });
    } catch (err: any) {
      console.error('Error creating stamped preview:', err);
      showStatus('Error al generar la previsualización del PDF estampado.', 'error');
    } finally {
      setIsStampingPreview(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!newNombre.trim() || !newTipo.trim() || !newPrograma.trim()) {
      showStatus('Nombre del Estudiante, Tipo de Documento y Programa son obligatorios.', 'error');
      return;
    }

    if (/diploma|acta/i.test(newTipo) && !isSuperAdmin) {
      showStatus('Permiso denegado: Solo el usuario admin@fundacionsanmateo.edu.co tiene autorización para expedir Diplomas y Actas de Grado.', 'error');
      return;
    }

    setIsCreating(true);

    let stampedPdfUrl: string | undefined = undefined;

    // If a PDF is attached, stamp it with watermark, logo on top-left, and consecutivo on top-right!
    if (attachedPdfFile) {
      try {
        const arrayBuffer = await attachedPdfFile.arrayBuffer();
        const stampedBytes = await stampOfficialDocumentPDF(arrayBuffer, {
          consecutivo: newConsecutivo,
          studentNombre: newNombre,
          studentDocumento: newDocumento,
          tipoDocumento: newTipo,
          programaCurso: newPrograma,
          fechaExpedicion: newFecha,
        });
        stampedPdfUrl = uint8ArrayToDataUrl(stampedBytes);
      } catch (e: any) {
        console.error('Error stamping PDF during document creation:', e);
        showStatus('Advertencia: No se pudo estampar el PDF adjunto, se creará el registro sin el archivo.', 'error');
      }
    }

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
      pdf_url: stampedPdfUrl,
    });

    setIsCreating(false);
    if (res.success) {
      showStatus(`Documento consecutivo ${res.consecutivo} expedido y verificado con éxito.`);
      setCreateModalOpen(false);
      setNewNombre('');
      setNewDocumento('');
      setNewPrograma('');
      setNewFolio('');
      setNewLibro('');
      setNewNotas('');
      setAttachedPdfFile(null);
      setPdfAutoDetectedMsg('');
      router.refresh();
    } else {
      showStatus(res.error || 'Error al expedir documento', 'error');
    }
  };

  // =========================================================================
  // BULK EXCEL / CSV PARSER
  // =========================================================================
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawData.length === 0) {
          showStatus('El archivo no contiene filas con datos válidos.', 'error');
          return;
        }

        const normalized: ParsedBulkItem[] = rawData.map((row) => {
          // Normalize column keys
          const keys = Object.keys(row);
          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const matchedKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(pk.toLowerCase().replace(/[^a-z0-9]/g, '')));
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const consecutivo = getVal(['consecutivo', 'codigo', 'id_documento']);
          const student_nombre = getVal(['nombre', 'estudiante', 'alumno', 'titular', 'nombre_completo', 'nombres']);
          const student_documento = getVal(['documento', 'cedula', 'identificacion', 'ti', 'cc', 'dni', 'doc']);
          let rawTipo = getVal(['tipo', 'tipo_documento', 'titulo', 'documento_tipo']) || 'Diploma de Grado';
          if (/calificaci|notas/i.test(rawTipo)) {
            rawTipo = 'Certificado de Notas';
          } else if (/pr[aá]ctica/i.test(rawTipo)) {
            rawTipo = 'Certificado de Prácticas';
          } else if (/costo/i.test(rawTipo)) {
            rawTipo = 'Certificado de Costos';
          }
          const tipo_documento = rawTipo;
          const programa_curso = getVal(['programa', 'curso', 'carrera', 'programa_curso', 'capacitacion']) || 'AUXILIAR EN ENFERMERÍA';
          
          let fecha_expedicion = getVal(['fecha', 'fecha_expedicion', 'expedicion', 'fecha_grado']);
          if (!fecha_expedicion) {
            fecha_expedicion = new Date().toISOString().split('T')[0];
          }

          const folio = getVal(['folio']);
          const libro = getVal(['libro']);
          const notas = getVal(['notas', 'observaciones', 'nota', 'detalle']);

          const isDiplomaOrActa = /diploma|acta/i.test(tipo_documento);
          const hasRestricted = isDiplomaOrActa && !isSuperAdmin;
          const isValid = Boolean(student_nombre && tipo_documento && programa_curso && !hasRestricted);
          const validationError = hasRestricted
            ? 'Solo admin@fundacionsanmateo.edu.co puede subir Diplomas o Actas'
            : !student_nombre 
            ? 'Falta el nombre del estudiante' 
            : !programa_curso 
            ? 'Falta el programa o curso' 
            : undefined;

          return {
            consecutivo: consecutivo || undefined,
            student_nombre,
            student_documento: student_documento || undefined,
            tipo_documento,
            programa_curso,
            fecha_expedicion,
            folio: folio || undefined,
            libro: libro || undefined,
            notas: notas || undefined,
            isValid,
            validationError
          };
        });

        setParsedRows(normalized);
      } catch (err: any) {
        console.error('Error parsing Excel/CSV:', err);
        showStatus('Error al leer el archivo Excel o CSV. Verifica que no esté dañado.', 'error');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit Bulk Excel/CSV
  const handleConfirmBulkExcel = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      showStatus('No hay registros válidos para procesar.', 'error');
      return;
    }

    setIsProcessingBulk(true);
    const res = await bulkCreateIssuedDocuments(validRows.map(r => ({
      consecutivo: r.consecutivo,
      student_nombre: r.student_nombre,
      student_documento: r.student_documento,
      tipo_documento: r.tipo_documento,
      programa_curso: r.programa_curso,
      fecha_expedicion: r.fecha_expedicion,
      folio: r.folio,
      libro: r.libro,
      notas: r.notas,
    })));

    setIsProcessingBulk(false);
    if (res.success) {
      showStatus(`¡Éxito! Se expidieron y registraron ${res.count} documentos con QR oficial.`);
      setBulkModalOpen(false);
      setParsedRows([]);
      setBulkFileName('');
      router.refresh();
    } else {
      showStatus(res.error || 'Error al procesar la carga masiva.', 'error');
    }
  };

  // =========================================================================
  // BULK PDF PARSER & HANDLER
  // =========================================================================
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const parsedPdfs = files.map(file => {
      // Try to parse name from filename: e.g. "DIPLOMA_JUAN_PEREZ_ENFERMERIA.pdf"
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_|-]/g, ' ').toUpperCase();
      let docType = isSuperAdmin ? 'Diploma de Grado' : 'Certificado de Estudio';
      if (cleanName.includes('ACTA')) docType = 'Acta de Grado';
      if (cleanName.includes('NOTAS') || cleanName.includes('CALIFICACI')) docType = 'Certificado de Notas';
      if (cleanName.includes('PRÁCTICA') || cleanName.includes('PRACTICA')) docType = 'Certificado de Prácticas';
      if (cleanName.includes('COSTO')) docType = 'Certificado de Costos';
      if (cleanName.includes('ESTUDIO') || cleanName.includes('CERTIFICADO')) docType = 'Certificado de Estudio';
      if (cleanName.includes('CONSTANCIA')) docType = 'Constancia de Asistencia';

      return {
        file,
        studentName: cleanName,
        docType,
        program: 'AUXILIAR EN ENFERMERÍA'
      };
    });

    setPdfFiles(parsedPdfs);
  };

  const handleConfirmBulkPdf = async () => {
    if (pdfFiles.length === 0) return;

    if (!isSuperAdmin && pdfFiles.some(p => /diploma|acta/i.test(p.docType))) {
      showStatus('Acceso denegado: Solo la cuenta oficial admin@fundacionsanmateo.edu.co puede subir o registrar Diplomas y Actas de Grado.', 'error');
      return;
    }

    setIsProcessingBulk(true);
    const itemsToCreate = pdfFiles.map(p => ({
      student_nombre: p.studentName,
      tipo_documento: p.docType,
      programa_curso: p.program,
      fecha_expedicion: new Date().toISOString().split('T')[0],
      notas: `Documento importado desde archivo PDF: ${p.file.name}`
    }));

    const res = await bulkCreateIssuedDocuments(itemsToCreate);
    setIsProcessingBulk(false);

    if (res.success) {
      showStatus(`¡Éxito! Se registraron ${res.count} documentos oficiales con código QR.`);
      setBulkModalOpen(false);
      setPdfFiles([]);
      router.refresh();
    } else {
      showStatus(res.error || 'Error al registrar documentos PDF.', 'error');
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
    setEditPdfUrl(doc.pdf_url || '');
    setEditAttachedPdfFile(null);
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;

    if (!isSuperAdmin && (/diploma|acta/i.test(editingDoc.tipo_documento) || /diploma|acta/i.test(editTipo))) {
      showStatus('Permiso denegado: Solo el usuario admin@fundacionsanmateo.edu.co puede modificar Diplomas y Actas de Grado.', 'error');
      return;
    }

    setIsSavingEdit(true);

    let stampedPdfUrl = editPdfUrl || undefined;

    if (editAttachedPdfFile) {
      try {
        const arrayBuffer = await editAttachedPdfFile.arrayBuffer();
        const stampedBytes = await stampOfficialDocumentPDF(arrayBuffer, {
          consecutivo: editConsecutivo,
          studentNombre: editNombre,
          studentDocumento: editDocumento,
          tipoDocumento: editTipo,
          programaCurso: editPrograma,
          fechaExpedicion: editFecha,
        });
        stampedPdfUrl = uint8ArrayToDataUrl(stampedBytes);
      } catch (err) {
        console.error('Error stamping updated PDF:', err);
        showStatus('Advertencia: No se pudo estampar el nuevo PDF', 'error');
      }
    }

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
      pdf_url: stampedPdfUrl,
    });

    setIsSavingEdit(false);
    if (res.success) {
      showStatus(`Documento ${editConsecutivo} actualizado con éxito.`);
      setEditingDoc(null);
      setEditAttachedPdfFile(null);
      router.refresh();
    } else {
      showStatus(res.error || 'Error al actualizar documento', 'error');
    }
  };

  const handleToggleState = (doc: DocumentItem) => {
    const isDiplomaOrActa = /diploma|acta/i.test(doc.tipo_documento);
    if (!isSuperAdmin && (isDiplomaOrActa || doc.estado === 'valido')) {
      showStatus('Permiso denegado: Solo el usuario admin@fundacionsanmateo.edu.co tiene autorización para anular diplomas y actas de grado.', 'error');
      return;
    }

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
    const isDiplomaOrActa = /diploma|acta/i.test(doc.tipo_documento);
    if (!isSuperAdmin && isDiplomaOrActa) {
      showStatus('Permiso denegado: Solo el usuario admin@fundacionsanmateo.edu.co puede eliminar Diplomas y Actas de Grado.', 'error');
      return;
    }
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

  // Download official PDF for document (Stamped PDF or generated diploma/certificate)
  const handleDownloadPDF = async (doc: DocumentItem) => {
    try {
      setIsGeneratingPdfId(doc.id);

      if (doc.pdf_url) {
        // Trigger download of official stamped PDF with watermark and consecutivo
        const safeName = doc.student_nombre ? `_${doc.student_nombre.trim().replace(/\s+/g, '_')}` : '';
        const link = document.createElement('a');
        link.href = doc.pdf_url;
        link.download = `FSM-000-${doc.consecutivo}${safeName}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showStatus(`PDF Oficial Estampado de ${doc.consecutivo} descargado exitosamente.`);
      } else {
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
      }
    } catch (e: any) {
      console.error('Error generating PDF:', e);
      showStatus('Error al descargar el PDF del documento.', 'error');
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
    const matchesTipo = !filterTipo || 
                        d.tipo_documento === filterTipo || 
                        (filterTipo === 'Certificado de Notas' && d.tipo_documento === 'Certificado de Calificaciones');
    const matchesEstado = filterEstado === 'all' || d.estado === filterEstado;
    return matchesSearch && matchesTipo && matchesEstado;
  });

  const documentTypes = [
    'Diploma de Grado',
    'Acta de Grado',
    'Certificado de Estudio',
    'Certificado de Notas',
    'Certificado de Prácticas',
    'Certificado de Costos',
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
          {/* Create Single Document */}
          <button
            onClick={() => {
              setNewConsecutivo(nextConsecutivo);
              setCreateModalOpen(true);
            }}
            className="px-5 py-3 bg-fsm-blue text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all shadow-md flex items-center gap-2 active:scale-95"
          >
            <Plus size={16} /> Expedir Documento
          </button>

          {/* Bulk Upload Button */}
          <button
            onClick={() => setBulkModalOpen(true)}
            className="px-5 py-3 bg-teal-800 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-teal-900 transition-all shadow-md flex items-center gap-2 active:scale-95"
          >
            <UploadCloud size={16} /> Subida Masiva (Excel / CSV / PDF)
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel || filteredDocs.length === 0}
            className="px-4 py-3 bg-emerald-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-800 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 active:scale-95"
          >
            <FileSpreadsheet size={16} /> {isExportingExcel ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>

        <Link
          href="/verificar"
          target="_blank"
          className="px-5 py-2.5 bg-white text-fsm-blue border border-fsm-blue/20 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-blue hover:text-white transition-all shadow-sm flex items-center gap-2"
        >
          <ExternalLink size={14} /> Portal de Verificación Pública
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
                          {doc.pdf_url && (
                            <span 
                              className="text-[9px] font-black text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                              title="Documento con archivo PDF oficial estampado adjunto"
                            >
                              <FileText size={10} /> PDF
                            </span>
                          )}
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
                          className={`px-2.5 py-1.5 text-white transition-all text-xs font-bold rounded-xl inline-flex items-center gap-1 shadow-sm disabled:opacity-50 ${
                            doc.pdf_url ? 'bg-teal-700 hover:bg-teal-800' : 'bg-fsm-blue hover:bg-fsm-red'
                          }`}
                          title={doc.pdf_url ? "Descargar PDF Estampado (Marca de agua, logo y consecutivo)" : "Descargar Certificado Institucional Oficial"}
                        >
                          <Download size={13} /> {isDownloading ? 'Generando...' : (doc.pdf_url ? 'PDF Estampado' : 'PDF')}
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
                        {(!/diploma|acta/i.test(doc.tipo_documento) || isSuperAdmin) ? (
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
                        ) : (
                          <span 
                            className="px-2.5 py-1.5 text-[10px] font-bold rounded-xl bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed inline-flex items-center gap-1"
                            title="Solo admin@fundacionsanmateo.edu.co puede anular diplomas y actas"
                          >
                            🔒 Bloqueado
                          </span>
                        )}

                        {/* Edit Button */}
                        {(!/diploma|acta/i.test(doc.tipo_documento) || isSuperAdmin) && (
                          <button
                            onClick={() => openEditModal(doc)}
                            className="p-1.5 text-gray-400 hover:text-fsm-blue transition-colors rounded-lg hover:bg-gray-100 inline-block align-middle"
                            title="Editar Registro"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Expedir Nuevo Documento (Individual) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-xl p-8 space-y-6 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
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
              {/* PDF Upload / Subir Documento Requerido */}
              <div className="bg-blue-50/50 border-2 border-dashed border-blue-200 hover:border-fsm-blue rounded-2xl p-4 transition-all">
                <input 
                  ref={createPdfInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleSelectCreatePdf}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-fsm-blue/10 text-fsm-blue flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-fsm-blue uppercase tracking-wide">
                          Subir Documento PDF Requerido
                        </span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-fsm-blue">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                        {attachedPdfFile 
                          ? `Archivo: ${attachedPdfFile.name} (${(attachedPdfFile.size / 1024).toFixed(1)} KB)`
                          : 'Adjunta el PDF del documento (diploma, notas, prácticas, costos o constancia) para estampar la marca de agua y consecutivo.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => createPdfInputRef.current?.click()}
                      className="px-4 py-2 bg-fsm-blue text-white hover:bg-fsm-red rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileUp size={14} /> {attachedPdfFile ? 'Cambiar PDF' : 'Subir PDF'}
                    </button>

                    {attachedPdfFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedPdfFile(null);
                          setPdfAutoDetectedMsg('');
                          if (createPdfInputRef.current) createPdfInputRef.current.value = '';
                        }}
                        className="p-2 text-gray-400 hover:text-fsm-red rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                        title="Quitar PDF"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stamping details info badge */}
                {attachedPdfFile && (
                  <div className="mt-3 pt-3 border-t border-blue-100/80 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                      <div className="bg-white p-2 rounded-lg border border-blue-100 flex items-center gap-1.5 text-gray-700 font-medium shadow-2xs">
                        <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                        <span><strong>Marca de Agua:</strong> Escudo FSM</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-blue-100 flex items-center gap-1.5 text-gray-700 font-medium shadow-2xs">
                        <Sparkles size={13} className="text-fsm-blue shrink-0" />
                        <span><strong>Esq. Sup. Izq:</strong> Logo FSM</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-blue-100 flex items-center gap-1.5 text-gray-700 font-medium shadow-2xs">
                        <QrCode size={13} className="text-fsm-red shrink-0" />
                        <span><strong>Esq. Sup. Der:</strong> {newConsecutivo}</span>
                      </div>
                    </div>

                    {pdfAutoDetectedMsg && (
                      <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>{pdfAutoDetectedMsg}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-bold text-gray-500">
                        Verifica el resultado visual antes de expedir:
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePreviewStampedPdf(attachedPdfFile)}
                        disabled={isStampingPreview}
                        className="text-xs font-black text-fsm-blue hover:text-fsm-red underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Eye size={13} /> {isStampingPreview ? 'Generando vista previa...' : 'Previsualizar PDF Estampado'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
                    {documentTypes.map(t => {
                      const isRestricted = !isSuperAdmin && /diploma|acta/i.test(t);
                      return (
                        <option key={t} value={t} disabled={isRestricted}>
                          {t} {isRestricted ? '🔒 (Solo Superadmin)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {!isSuperAdmin && (
                    <p className="text-[10px] text-amber-600 mt-1 font-semibold">
                      ℹ️ La expedición de Diplomas y Actas de Grado está restringida a la Dirección (admin@fundacionsanmateo.edu.co).
                    </p>
                  )}
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
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateDocument}
                disabled={isCreating || (!isSuperAdmin && /diploma|acta/i.test(newTipo))}
                className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
              >
                <Save size={16} /> {isCreating ? 'Expidiendo y Estampando...' : 'Expedir Documento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Subida Masiva (Excel / CSV / PDF) */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-4xl p-8 space-y-6 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  IMPORTACIÓN MASIVA
                </span>
                <h3 className="text-xl font-black text-fsm-blue uppercase leading-tight mt-1.5">
                  CARGA MASIVA DE DOCUMENTOS PARA VERIFICACIÓN
                </h3>
              </div>
              <button 
                onClick={() => {
                  setBulkModalOpen(false);
                  setParsedRows([]);
                  setBulkFileName('');
                  setPdfFiles([]);
                }}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Selectors */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <button
                type="button"
                onClick={() => setBulkTab('excel')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                  bulkTab === 'excel'
                    ? 'bg-fsm-blue text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileSpreadsheet size={15} /> Subir Archivo Excel / CSV
              </button>

              <button
                type="button"
                onClick={() => setBulkTab('pdf')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                  bulkTab === 'pdf'
                    ? 'bg-fsm-blue text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileText size={15} /> Subir Documentos PDF
              </button>
            </div>

            {/* TAB 1: EXCEL & CSV */}
            {bulkTab === 'excel' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                  <div className="text-xs text-gray-700">
                    <strong className="text-fsm-blue">¿Primera vez usando la carga masiva?</strong> Descarga la plantilla oficial con los campos y columnas pre-configurados.
                  </div>
                  <button
                    type="button"
                    onClick={() => exportBulkImportTemplateExcel()}
                    className="px-4 py-2 bg-white text-fsm-blue border border-fsm-blue/20 hover:bg-fsm-blue hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Download size={14} /> Descargar Plantilla Excel
                  </button>
                </div>

                {/* Dropzone */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-fsm-blue rounded-3xl p-8 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-blue-50/20 flex flex-col items-center justify-center space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleExcelUpload}
                  />
                  <div className="w-16 h-16 bg-teal-50 text-teal-800 rounded-full flex items-center justify-center border border-teal-100 shadow-inner">
                    <FileUp size={30} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-gray-800 uppercase">
                      {bulkFileName ? bulkFileName : 'Haz clic para seleccionar o arrastra tu archivo Excel / CSV'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos compatibles: .xlsx, .xls, .csv (Se detectarán nombres, cédulas, títulos y programas automáticamente)
                    </p>
                  </div>
                </div>

                {/* Preview Table */}
                {parsedRows.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black text-fsm-blue uppercase tracking-wider">
                        Filas Detectadas: {parsedRows.length} ({parsedRows.filter(r => r.isValid).length} válidas)
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setParsedRows([]);
                          setBulkFileName('');
                        }}
                        className="text-xs font-bold text-fsm-red hover:underline"
                      >
                        Limpiar lista
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-gray-100 text-[10px] font-black uppercase text-gray-600 sticky top-0">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Consecutivo</th>
                            <th className="p-3">Estudiante</th>
                            <th className="p-3">Documento</th>
                            <th className="p-3">Tipo Documento</th>
                            <th className="p-3">Programa</th>
                            <th className="p-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {parsedRows.map((r, i) => (
                            <tr key={i} className={r.isValid ? 'hover:bg-gray-50' : 'bg-red-50/50'}>
                              <td className="p-3 font-mono text-gray-400">{i + 1}</td>
                              <td className="p-3 font-mono font-bold text-fsm-blue">
                                {r.consecutivo || <span className="text-gray-400 font-normal italic">Auto-generar</span>}
                              </td>
                              <td className="p-3 font-bold text-gray-900 uppercase">{r.student_nombre || <span className="text-red-500">Falta Nombre</span>}</td>
                              <td className="p-3 text-gray-600">{r.student_documento || 'S/D'}</td>
                              <td className="p-3 text-gray-700">{r.tipo_documento}</td>
                              <td className="p-3 text-gray-600 uppercase">{r.programa_curso}</td>
                              <td className="p-3">
                                {r.isValid ? (
                                  <span className="text-[9px] font-black text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200">
                                    LISTO
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black text-fsm-red bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                                    {r.validationError || 'ERROR'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkModalOpen(false);
                      setParsedRows([]);
                    }}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBulkExcel}
                    disabled={isProcessingBulk || parsedRows.filter(r => r.isValid).length === 0}
                    className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
                  >
                    {isProcessingBulk ? <RefreshCw className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                    {isProcessingBulk ? 'Procesando Documentos...' : `Confirmar e Importar (${parsedRows.filter(r => r.isValid).length})`}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PDF UPLOAD */}
            {bulkTab === 'pdf' && (
              <div className="space-y-6">
                <div 
                  onClick={() => pdfInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-fsm-blue rounded-3xl p-8 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-blue-50/20 flex flex-col items-center justify-center space-y-3"
                >
                  <input
                    ref={pdfInputRef}
                    type="file"
                    multiple
                    accept=".pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                  />
                  <div className="w-16 h-16 bg-red-50 text-fsm-red rounded-full flex items-center justify-center border border-red-100 shadow-inner">
                    <FileText size={30} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-gray-800 uppercase">
                      Selecciona o arrastra varios archivos PDF de diplomas o certificados
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      El sistema extraerá el nombre y creará un expediente con consecutivo único y código QR para cada uno.
                    </p>
                  </div>
                </div>

                {pdfFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-black text-fsm-blue uppercase tracking-wider">
                      Archivos PDF Cargados: {pdfFiles.length}
                    </div>

                    <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
                      {pdfFiles.map((pdf, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <File className="text-fsm-red shrink-0" size={18} />
                            <div>
                              <div className="font-bold text-xs text-gray-900">{pdf.file.name}</div>
                              <div className="text-[10px] text-gray-500 uppercase">{pdf.studentName} — {pdf.docType}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400">{(pdf.file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkModalOpen(false);
                      setPdfFiles([]);
                    }}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBulkPdf}
                    disabled={isProcessingBulk || pdfFiles.length === 0}
                    className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
                  >
                    {isProcessingBulk ? <RefreshCw className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                    {isProcessingBulk ? 'Procesando...' : `Registrar ${pdfFiles.length} Documentos con QR`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: QR Viewer & Actions Modal */}
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

      {/* Modal 4: Edit Document Modal */}
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
                    {documentTypes.map(t => {
                      const isRestricted = !isSuperAdmin && /diploma|acta/i.test(t);
                      return (
                        <option key={t} value={t} disabled={isRestricted}>
                          {t} {isRestricted ? '🔒 (Solo Superadmin)' : ''}
                        </option>
                      );
                    })}
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

              {/* PDF Attachment in Edit Modal */}
              <div className="bg-blue-50/50 border-2 border-dashed border-blue-200 hover:border-fsm-blue rounded-2xl p-4 transition-all">
                <input 
                  ref={editPdfInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.name.toLowerCase().endsWith('.pdf')) {
                      setEditAttachedPdfFile(f);
                      showStatus(`Nuevo PDF "${f.name}" seleccionado para estampar.`);
                    }
                  }}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-fsm-blue/10 text-fsm-blue flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-fsm-blue uppercase tracking-wide">
                        {editAttachedPdfFile ? 'Nuevo PDF Seleccionado' : (editPdfUrl ? 'PDF Oficial Ya Adjunto' : 'Adjuntar Documento PDF')}
                      </span>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                        {editAttachedPdfFile 
                          ? `Archivo: ${editAttachedPdfFile.name} (${(editAttachedPdfFile.size / 1024).toFixed(1)} KB)`
                          : (editPdfUrl ? 'Este documento ya cuenta con un PDF estampado. Puedes reemplazarlo si lo deseas.' : 'Sube el PDF para estampar marca de agua, logo y consecutivo.')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => editPdfInputRef.current?.click()}
                      className="px-4 py-2 bg-fsm-blue text-white hover:bg-fsm-red rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileUp size={14} /> {editAttachedPdfFile || editPdfUrl ? 'Reemplazar PDF' : 'Subir PDF'}
                    </button>

                    {(editAttachedPdfFile || editPdfUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditAttachedPdfFile(null);
                          setEditPdfUrl('');
                          if (editPdfInputRef.current) editPdfInputRef.current.value = '';
                        }}
                        className="p-2 text-gray-400 hover:text-fsm-red rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                        title="Quitar PDF"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {editAttachedPdfFile && (
                  <div className="mt-3 pt-3 border-t border-blue-100/80 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500">
                      Previsualiza el PDF estampado con los nuevos datos:
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePreviewStampedPdf(editAttachedPdfFile)}
                      disabled={isStampingPreview}
                      className="text-xs font-black text-fsm-blue hover:text-fsm-red underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Eye size={13} /> {isStampingPreview ? 'Generando...' : 'Previsualizar PDF Estampado'}
                    </button>
                  </div>
                )}
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
              {(!editingDoc || !/diploma|acta/i.test(editingDoc.tipo_documento) || isSuperAdmin) ? (
                <button
                  type="button"
                  onClick={() => handleDelete(editingDoc)}
                  className="px-4 py-2 bg-red-50 text-fsm-red hover:bg-fsm-red hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              ) : (
                <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                  🔒 Eliminación restringida a Dirección
                </span>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || (!isSuperAdmin && /diploma|acta/i.test(editTipo))}
                  className="px-5 py-2 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <Save size={14} /> {isSavingEdit ? 'Guardando y Estampando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Custom Branded Fundación San Mateo Confirmation Modal */}
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
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer ${
                  confirmDialog.confirmBtnClass || 'bg-fsm-blue text-white hover:bg-fsm-red'
                }`}
              >
                {confirmDialog.confirmBtnText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Live Stamped PDF Preview Modal */}
      {previewPdfModal.isOpen && (
        <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-4xl h-[88vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center bg-fsm-blue text-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">VISTA PREVIA DOCUMENTO ESTAMPADO</span>
                  <h3 className="text-sm font-black uppercase tracking-wide leading-none mt-0.5">{previewPdfModal.title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewPdfModal.url}
                  target="_blank"
                  download={`FSM-000-${previewPdfModal.consecutivo || (editingDoc ? editConsecutivo : newConsecutivo)}.pdf`}
                  className="px-3 py-1.5 bg-white text-fsm-blue hover:bg-fsm-red hover:text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                >
                  <Download size={14} /> Descargar PDF
                </a>
                <button
                  onClick={() => setPreviewPdfModal({ isOpen: false, url: '', title: '' })}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-100 p-2 overflow-hidden">
              <iframe
                src={previewPdfModal.url}
                className="w-full h-full rounded-xl border border-gray-300 shadow-inner"
                title="Vista previa del PDF estampado"
              />
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 size={14} /> Marca de Agua (Escudo FSM)
                </span>
                <span className="flex items-center gap-1 text-fsm-blue font-bold">
                  <CheckCircle2 size={14} /> Logo Superior Izquierdo
                </span>
                <span className="flex items-center gap-1 text-fsm-red font-bold">
                  <CheckCircle2 size={14} /> Consecutivo y QR Superior Derecho
                </span>
              </div>
              <button
                onClick={() => setPreviewPdfModal({ isOpen: false, url: '', title: '' })}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
