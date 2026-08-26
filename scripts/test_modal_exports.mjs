import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const sampleEvents = [
  {
    student_name: 'ARROYAVE GOMEZ LAURA DARIAM',
    student_grado: '1 AIPI',
    tipo_evento: 'entrada',
    reader_name: 'Entrada Principal',
    reader_id: 'PANEL-01',
    origen: 'panel',
    timestamp: '2026-08-18T13:05:00-05:00',
    rfid_tag_uid: '4F003FF85D',
    isAnomaly: false
  },
  {
    student_name: 'ZERPA MURILLO PAUL ALEJANDRO',
    student_grado: 'SECRETARIA ACADEMICA',
    tipo_evento: 'salida',
    reader_name: 'Entrada Manual Secretaría',
    reader_id: 'manual-web',
    origen: 'manual',
    timestamp: '2026-08-18T17:30:00-05:00',
    rfid_tag_uid: 'MANUAL',
    isAnomaly: false
  }
];

// Test XLSX
const headers = ['Estudiante', 'Grado / Cargo', 'Tipo Evento', 'Hora', 'Fecha (Bogotá)', 'Lector / Ubicación', 'Origen', 'Estado / Anomalía', 'UID Tarjeta'];
const rows = sampleEvents.map(ev => [
  ev.student_name,
  ev.student_grado,
  ev.tipo_evento === 'salida' ? 'Salida' : 'Entrada',
  '01:05:00 PM',
  '18/08/2026',
  ev.reader_name,
  ev.origen === 'manual' ? 'Registro Manual Secretaría' : 'Panel Fijo',
  ev.isAnomaly ? 'Anomalía' : 'Correcto',
  ev.rfid_tag_uid
]);

const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
ws['!cols'] = [
  { wch: 32 }, { wch: 22 }, { wch: 12 }, { wch: 14 },
  { wch: 14 }, { wch: 26 }, { wch: 26 }, { wch: 18 }, { wch: 16 }
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
console.log('XLSX generated successfully!');

// Test PDF Landscape
const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

// Header title
doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
doc.setTextColor(11, 37, 69); // #0B2545 Navy Blue
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
doc.text(`Rango de Fechas: 18/08/2026 | Total Registros: ${sampleEvents.length} | Generado: ${new Date().toLocaleString('es-CO')}`, 14, 33);

autoTable(doc, {
  startY: 37,
  head: [['#', 'Estudiante', 'Grado / Cargo', 'Tipo', 'Hora', 'Fecha', 'Lector / Ubicación', 'Origen', 'Estado']],
  body: sampleEvents.map((ev, i) => [
    i + 1,
    ev.student_name,
    ev.student_grado,
    ev.tipo_evento === 'salida' ? 'Salida' : 'Entrada',
    '01:05 PM',
    '18/08/2026',
    ev.reader_name,
    ev.origen === 'manual' ? 'Manual' : 'Panel Fijo',
    ev.isAnomaly ? 'Anomalía' : 'Correcto'
  ]),
  headStyles: { fillColor: [11, 37, 69], textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  styles: { fontSize: 8, cellPadding: 2 },
});

console.log('PDF generated successfully!');
