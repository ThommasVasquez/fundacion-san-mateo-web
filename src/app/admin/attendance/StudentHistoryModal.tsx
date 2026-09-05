'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Clock } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';

interface StudentHistoryModalProps {
  historyStudent: {
    id: string;
    norm_id?: string;
    nombre: string;
    grado?: string;
    rfid_tag_uid?: string;
  };
  historyEvents: Array<{
    id: string;
    fecha: string;
    timestamp: string;
    dia_semana_texto?: string;
    group_name?: string;
    estado: string;
    tipo_evento: string;
    reader_name?: string;
    reader_id?: string;
    origen?: string;
    sede?: string;
    observaciones?: string;
  }>;
  closeUrl: string;
}

const ZONA_HORARIA = 'America/Bogota';

export default function StudentHistoryModal({
  historyStudent,
  historyEvents,
  closeUrl
}: StudentHistoryModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    // Remove query param from URL cleanly
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('studentHistoryId');
      window.history.pushState({}, '', url.toString());
    }
    router.push(closeUrl, { scroll: false });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeUrl]);

  if (!isOpen) return null;

  const editorUrl = `/admin/attendance/students/${historyStudent.norm_id || historyStudent.id}`;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Clickable Backdrop to close */}
      <div 
        className="absolute inset-0 -z-10 cursor-pointer" 
        onClick={handleClose} 
        aria-label="Cerrar modal"
      />

      <div 
        className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-2xl h-[75vh] flex flex-col relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center bg-fsm-blue text-white px-8 py-5">
          <div>
            <span className="text-[9px] font-black tracking-widest uppercase">Historial del Estudiante</span>
            <h3 className="text-xl font-black uppercase mt-0.5">{historyStudent.nombre}</h3>
            <p className="text-xs opacity-75 font-semibold">
              Grado: {historyStudent.grado || 'No especificado'} | Tag UID: {historyStudent.rfid_tag_uid || 'No vinculado'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href={editorUrl}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20"
            >
              📝 Editor de Excusas →
            </Link>
            <button 
              type="button"
              onClick={handleClose}
              className="text-white/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          {historyEvents.length === 0 ? (
            <p className="text-center text-gray-400 font-medium py-12">
              No hay registros de asistencia para este estudiante.
            </p>
          ) : (
            <div className="relative border-l border-gray-100 pl-6 ml-3 space-y-6">
              {historyEvents.map((hev) => (
                <div key={hev.id || `${hev.fecha}_${hev.estado}`} className="relative">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                    hev.estado === 'CONGELADO' 
                      ? 'bg-blue-400' 
                      : hev.estado === 'AUSENTE' 
                      ? 'bg-fsm-red' 
                      : hev.tipo_evento === 'salida' 
                      ? 'bg-orange-500' 
                      : 'bg-green-500'
                  }`} />
                  
                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    hev.estado === 'CONGELADO' 
                      ? 'bg-blue-50/40 border-blue-100' 
                      : hev.estado === 'AUSENTE' 
                      ? 'bg-red-50/40 border-red-100' 
                      : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        hev.estado === 'CONGELADO'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : hev.estado === 'AUSENTE'
                          ? 'bg-red-100 text-fsm-red border-red-200'
                          : hev.tipo_evento === 'salida'
                          ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : 'bg-green-100 text-green-700 border-green-200'
                      }`}>
                        {hev.estado === 'CONGELADO' 
                          ? '🧊 CONGELADO / INACTIVO' 
                          : hev.estado === 'AUSENTE' 
                          ? '❌ INASISTENCIA' 
                          : hev.tipo_evento === 'salida' 
                          ? '📤 SALIDA' 
                          : '📥 ENTRADA'}
                      </span>
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {hev.estado === 'AUSENTE' || hev.estado === 'CONGELADO'
                          ? `Día Lectivo: ${formatDateDDMMYYYY(hev.fecha)}`
                          : `${formatDateDDMMYYYY(hev.timestamp)} ${new Date(hev.timestamp).toLocaleTimeString('es-CO', { timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-800">
                      {hev.estado === 'AUSENTE' ? `Grupo: ${hev.group_name || historyStudent.grado}` : `Ubicación: ${hev.reader_name || hev.reader_id}`}
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium">
                      Origen: {hev.origen || 'Sistema'} {hev.sede ? `• Sede: ${hev.sede}` : ''}
                    </p>
                    {hev.observaciones && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-200/50">
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                          💬 Excusa / Novedad: {hev.observaciones}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-8 py-4 flex items-center justify-between">
          <Link 
            href={editorUrl}
            className="text-xs font-bold text-fsm-blue hover:underline flex items-center gap-1"
          >
            📝 Abrir Administrador de Excusas Completo →
          </Link>
          <button 
            type="button"
            onClick={handleClose}
            className="px-6 py-2 bg-white text-fsm-blue border border-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 hover:text-fsm-red transition-all shadow-sm cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
