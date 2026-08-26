'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileCode, X, Check, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';

interface EventItem {
  student_name?: string;
  student_grado?: string;
  tipo_evento: string;
  reader_name?: string;
  reader_id: string;
  origen: string;
  timestamp: string;
  rfid_tag_uid: string;
  isAnomaly: boolean;
  anomalyReason?: string;
  sede?: string;
  observaciones?: string;
}

interface ExportCsvButtonProps {
  events: EventItem[];
  startDate: string;
  endDate: string;
}

type ExportFormat = 'excel' | 'pdf' | 'csv';

export default function ExportCsvButton({ events, startDate, endDate }: ExportCsvButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [isExporting, setIsExporting] = useState(false);

  const rangeName = startDate === endDate ? startDate : `${startDate}_a_${endDate}`;

  const [excelLayout, setExcelLayout] = useState<'matrix' | 'list'>('matrix');

  const formatData = () => {
    return events.map(ev => {
      const dateObj = new Date(ev.timestamp);
      const dateStr = formatDateDDMMYYYY(ev.timestamp);
      const timeStr = dateObj.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const studentName = ev.student_name || 'Tarjeta no asignada';
      const grado = ev.student_grado || 'N/A';
      const tipoEvento = ev.tipo_evento === 'salida' ? 'Salida' : 'Entrada';
      const sede = ev.sede || 'Sede 1';
      const reader = ev.reader_name || ev.reader_id;
      const origen = ev.origen === 'manual' ? 'Registro Manual Secretaría' : ev.origen === 'movil_profesor' ? 'Móvil Profesor' : 'Panel Fijo';
      const observaciones = ev.observaciones || '-';
      const estado = ev.isAnomaly ? `Anomalía (${ev.anomalyReason || 'Revisión'})` : 'Correcto';
      const uid = ev.rfid_tag_uid;

      return {
        studentName,
        grado,
        tipoEvento,
        timeStr,
        dateStr,
        sede,
        reader,
        origen,
        observaciones,
        estado,
        uid
      };
    });
  };

  const exportExcelMatrix = () => {
    // 1. Extract distinct students (sorted alphabetically)
    const studentsSet = new Map<string, string>();
    events.forEach(ev => {
      if (ev.student_name && ev.student_name !== 'Tarjeta no asignada') {
        studentsSet.set(ev.student_name, ev.student_grado || '');
      }
    });

    const sortedStudents = Array.from(studentsSet.keys()).sort((a, b) => 
      a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
    );

    // 2. Extract distinct dates (sorted ascending)
    const datesMap = new Map<string, Date>();
    events.forEach(ev => {
      const dateObj = new Date(ev.timestamp);
      const dateStr = formatDateDDMMYYYY(ev.timestamp);
      if (!datesMap.has(dateStr)) {
        datesMap.set(dateStr, dateObj);
      }
    });

    const sortedDates = Array.from(datesMap.entries()).sort((a, b) => a[1].getTime() - b[1].getTime());

    // 3. Map event statuses by student and date
    const eventGrid = new Map<string, string>();
    events.forEach(ev => {
      if (!ev.student_name || ev.student_name === 'Tarjeta no asignada') return;
      const dateObj = new Date(ev.timestamp);
      const dateStr = formatDateDDMMYYYY(ev.timestamp);
      const timeStr = dateObj.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
      const key = `${ev.student_name}|${dateStr}`;

      const cellText = ev.tipo_evento === 'salida' ? `Salida (${timeStr})` : timeStr;
      eventGrid.set(key, cellText);
    });

    // 4. Construct Header Row
    const SPANISH_DAYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const headers = ['DÍA', 'FECHA', ...sortedStudents];

    // 5. Construct Data Rows
    const rows = sortedDates.map(([dateStr, dateObj]) => {
      const dayName = SPANISH_DAYS[dateObj.getDay()];
      const rowData = [dayName, dateStr];

      sortedStudents.forEach(stName => {
        const key = `${stName}|${dateStr}`;
        const val = eventGrid.get(key) || 'AUSENTE';
        rowData.push(val);
      });

      return rowData;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      ...sortedStudents.map(() => ({ wch: 30 }))
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz Asistencia');
    XLSX.writeFile(wb, `Matriz_Asistencia_${rangeName}.xlsx`);
  };

  const exportExcelList = (formatted: ReturnType<typeof formatData>) => {
    const headers = ['Estudiante', 'Grado / Cargo', 'Tipo Evento', 'Hora', 'Fecha (Bogotá)', 'Sede', 'Lector / Ubicación', 'Origen', 'Observaciones', 'Estado / Anomalía', 'UID Tarjeta'];
    const rows = formatted.map(ev => [
      ev.studentName,
      ev.grado,
      ev.tipoEvento,
      ev.timeStr,
      ev.dateStr,
      ev.sede,
      ev.reader,
      ev.origen,
      ev.observaciones,
      ev.estado,
      ev.uid
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 32 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 24 }, { wch: 28 }, { wch: 28 }, { wch: 30 }, { wch: 20 }, { wch: 16 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
    XLSX.writeFile(wb, `Reporte_Asistencia_${rangeName}.xlsx`);
  };

  const exportPdf = (formatted: ReturnType<typeof formatData>) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 37, 69);
    doc.text('FUNDACIÓN SAN MATEO', 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('INSTITUCIÓN PARA EL TRABAJO Y DESARROLLO HUMANO - SOACHA', 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REPORTE OFICIAL DE CONTROL DE ASISTENCIA', 14, 28);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const nowStr = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    doc.text(`Rango de Consulta: ${rangeName}  |  Total Registros: ${events.length}  |  Fecha de Generación: ${nowStr}`, 14, 33);

    autoTable(doc, {
      startY: 37,
      head: [['#', 'Estudiante', 'Grado', 'Tipo', 'Hora', 'Fecha', 'Sede', 'Lector', 'Origen', 'Observaciones', 'Estado']],
      body: formatted.map((ev, i) => [
        i + 1,
        ev.studentName,
        ev.grado,
        ev.tipoEvento,
        ev.timeStr,
        ev.dateStr,
        ev.sede,
        ev.reader,
        ev.origen,
        ev.observaciones,
        ev.estado
      ]),
      headStyles: { 
        fillColor: [11, 37, 69], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left'
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] 
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 2.5,
        textColor: [30, 41, 59]
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}  |  Fundación San Mateo - Sistema Administrativo`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 8,
          { align: 'center' }
        );
      }
    });

    doc.save(`Reporte_Asistencia_${rangeName}.pdf`);
  };

  const exportCsv = (formatted: ReturnType<typeof formatData>) => {
    const headers = [
      'Estudiante',
      'Grado',
      'Tipo Evento',
      'Hora',
      'Fecha (Bogotá)',
      'Sede',
      'Lector / Ubicación',
      'Origen',
      'Observaciones',
      'Estado / Anomalía',
      'UID Tarjeta'
    ];

    const rows = formatted.map(ev => [
      `"${ev.studentName.replace(/"/g, '""')}"`,
      `"${ev.grado}"`,
      `"${ev.tipoEvento}"`,
      `"${ev.timeStr}"`,
      `"${ev.dateStr}"`,
      `"${ev.sede.replace(/"/g, '""')}"`,
      `"${ev.reader.replace(/"/g, '""')}"`,
      `"${ev.origen.replace(/"/g, '""')}"`,
      `"${ev.observaciones.replace(/"/g, '""')}"`,
      `"${ev.estado.replace(/"/g, '""')}"`,
      `"${ev.uid}"`
    ].join(';'));

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.setAttribute('download', `Reporte_Asistencia_${rangeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmExport = () => {
    if (!events || events.length === 0) {
      alert('No hay registros para exportar con los filtros seleccionados.');
      return;
    }

    setIsExporting(true);

    setTimeout(() => {
      try {
        const formatted = formatData();
        if (format === 'excel') {
          if (excelLayout === 'matrix') {
            exportExcelMatrix();
          } else {
            exportExcelList(formatted);
          }
        } else if (format === 'pdf') {
          exportPdf(formatted);
        } else if (format === 'csv') {
          exportCsv(formatted);
        }
        setIsOpen(false);
      } catch (err: any) {
        console.error('Error exporting file:', err);
        alert('Error al generar el reporte: ' + (err?.message || 'Error desconocido'));
      } finally {
        setIsExporting(false);
      }
    }, 150);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-5 py-2.5 bg-green-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-800 transition-all shadow-sm flex items-center gap-2"
      >
        <Download size={16} /> Descargar Reporte ({events.length})
      </button>

      {/* Modal Format Selector */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl max-w-md w-full overflow-hidden p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-fsm-blue/10 text-fsm-blue flex items-center justify-center font-black shrink-0">
                  <Download size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-fsm-blue uppercase leading-tight">Descargar Reporte</h3>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">
                    {events.length} registro(s) ({rangeName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-all flex items-center justify-center shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Format Options */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Selecciona el Formato de Archivo:
              </p>

              {/* Option 1: Excel (.xlsx) */}
              <div
                onClick={() => setFormat('excel')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                  format === 'excel'
                    ? 'border-green-600 bg-green-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold shrink-0">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 uppercase">Excel (.xlsx)</h4>
                      <p className="text-[11px] font-medium text-gray-500">Hoja de cálculo para análisis de asistencia.</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    format === 'excel' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'
                  }`}>
                    {format === 'excel' && <Check size={14} />}
                  </div>
                </div>

                {/* Excel Layout Sub-options */}
                {format === 'excel' && (
                  <div className="pt-2 border-t border-green-200/60 grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setExcelLayout('matrix')}
                      className={`px-3 py-2 rounded-xl text-[11px] font-bold uppercase transition-all border ${
                        excelLayout === 'matrix'
                          ? 'bg-green-700 text-white border-green-800 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      📊 Matriz (Estudiantes en cols)
                    </button>

                    <button
                      type="button"
                      onClick={() => setExcelLayout('list')}
                      className={`px-3 py-2 rounded-xl text-[11px] font-bold uppercase transition-all border ${
                        excelLayout === 'list'
                          ? 'bg-green-700 text-white border-green-800 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      📋 Listado de Pases
                    </button>
                  </div>
                )}
              </div>

              {/* Option 2: PDF (.pdf) */}
              <div
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  format === 'pdf'
                    ? 'border-red-600 bg-red-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 uppercase">Documento PDF (.pdf)</h4>
                    <p className="text-[11px] font-medium text-gray-500">Documento oficial de la Fundación San Mateo para imprimir o presentar.</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  format === 'pdf' ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300'
                }`}>
                  {format === 'pdf' && <Check size={14} />}
                </div>
              </div>

              {/* Option 3: CSV (.csv) */}
              <div
                onClick={() => setFormat('csv')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  format === 'csv'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                    <FileCode size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 uppercase">Texto Plano CSV (.csv)</h4>
                    <p className="text-[11px] font-medium text-gray-500">Valores separados por punto y coma (;) con codificación UTF-8 BOM.</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  format === 'csv' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}>
                  {format === 'csv' && <Check size={14} />}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isExporting}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExport}
                disabled={isExporting}
                className="flex-1 py-3 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-fsm-red transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Generando...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Descargar {format.toUpperCase()}
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
