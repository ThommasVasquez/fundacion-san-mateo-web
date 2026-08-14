'use client';

import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

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
}

interface ExportCsvButtonProps {
  events: EventItem[];
  startDate: string;
  endDate: string;
}

export default function ExportCsvButton({ events, startDate, endDate }: ExportCsvButtonProps) {
  const handleExport = () => {
    if (!events || events.length === 0) {
      alert('No hay registros para exportar con los filtros seleccionados.');
      return;
    }

    const headers = [
      'Estudiante',
      'Grado',
      'Hora de Entrada',
      'Fecha (Bogotá)',
      'Lector / Ubicación',
      'Origen',
      'Estado / Anomalía',
      'UID Tarjeta'
    ];

    const rows = events.map(ev => {
      const dateObj = new Date(ev.timestamp);
      const dateStr = dateObj.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
      const timeStr = dateObj.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const studentName = ev.student_name || 'Tarjeta no asignada';
      const grado = ev.student_grado || 'N/A';
      const reader = ev.reader_name || ev.reader_id;
      const origen = ev.origen === 'movil_profesor' ? 'Móvil Profesor' : 'Panel Fijo';
      const estado = ev.isAnomaly ? `Anomalía (${ev.anomalyReason || 'Revisión'})` : 'Correcto';
      const uid = ev.rfid_tag_uid;

      return [
        `"${studentName.replace(/"/g, '""')}"`,
        `"${grado}"`,
        `"${timeStr}"`,
        `"${dateStr}"`,
        `"${reader.replace(/"/g, '""')}"`,
        `"${origen}"`,
        `"${estado.replace(/"/g, '""')}"`,
        `"${uid}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const rangeName = startDate === endDate ? startDate : `${startDate}_a_${endDate}`;
    link.href = url;
    link.setAttribute('download', `Reporte_Asistencia_${rangeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="px-5 py-2.5 bg-green-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-800 transition-all shadow-sm flex items-center gap-2"
    >
      <FileSpreadsheet size={16} /> Exportar Excel ({events.length})
    </button>
  );
}
