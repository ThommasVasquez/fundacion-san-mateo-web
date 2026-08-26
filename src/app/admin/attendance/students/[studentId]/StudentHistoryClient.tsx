'use client';

import React, { useState } from 'react';
import { updateStudentAbsenceExcuse } from '@/app/actions';
import { Check, Edit3, Loader2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';

interface HistoryRecord {
  record_id?: string;
  session_id: string;
  fecha: string;
  dia_semana_texto?: string;
  group_name: string;
  estado: string;
  fuente: string;
  sede: string;
  observaciones?: string;
  scan_time?: string;
}

interface StudentHistoryClientProps {
  studentId: string;
  records: HistoryRecord[];
}

export default function StudentHistoryClient({ studentId, records }: StudentHistoryClientProps) {
  const router = useRouter();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('AUSENTE');
  const [editObs, setEditObs] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const handleStartEdit = (rec: HistoryRecord) => {
    setEditingSessionId(rec.session_id);
    setEditStatus(rec.estado);
    setEditObs(rec.observaciones || '');
  };

  const handleSaveEdit = async (sessionId: string) => {
    setLoading(true);
    const res = await updateStudentAbsenceExcuse(studentId, sessionId, editStatus, editObs);
    setLoading(false);

    if (res.success) {
      setStatusMsg('✓ Excusa / Observación guardada correctamente.');
      setEditingSessionId(null);
      setTimeout(() => setStatusMsg(''), 4000);
      router.refresh();
    } else {
      alert(res.error || 'Error al guardar');
    }
  };

  return (
    <div className="space-y-4">
      {statusMsg && (
        <div className="p-3 bg-green-50 text-green-700 border border-green-200 font-bold text-xs rounded-xl">
          {statusMsg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Día</th>
              <th className="py-3 px-4">Grupo</th>
              <th className="py-3 px-4">Estado / Hora Pase</th>
              <th className="py-3 px-4">Sede / Origen</th>
              <th className="py-3 px-4">Excusa / Observaciones</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {records.map((r) => {
              const isEditing = editingSessionId === r.session_id;
              const dateObj = new Date(r.fecha);
              const fechaStr = formatDateDDMMYYYY(r.fecha);

              return (
                <tr
                  key={r.session_id}
                  className={`hover:bg-gray-50/50 transition-colors ${
                    r.estado === 'AUSENTE' ? 'bg-red-50/20' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-gray-800">{fechaStr}</td>
                  <td className="py-3 px-4 font-semibold text-gray-500">{r.dia_semana_texto || '-'}</td>
                  <td className="py-3 px-4 font-bold text-fsm-blue">{r.group_name}</td>
                  
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="bg-white border border-gray-300 rounded px-2 py-1 font-bold text-xs"
                      >
                        <option value="AUSENTE">❌ INASISTENCIA</option>
                        <option value="EXCUSA_MEDICA">📝 EXCUSA MÉDICA</option>
                        <option value="PRESENTE">✅ PRESENTE</option>
                        <option value="FESTIVO">🎉 FESTIVO</option>
                        <option value="LIBRE">🕊️ LIBRE</option>
                      </select>
                    ) : (
                      <div className="space-y-0.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-black uppercase text-[10px] border ${
                            r.estado === 'PRESENTE'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : r.estado === 'AUSENTE'
                              ? 'bg-red-50 text-fsm-red border-red-200 shadow-sm'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {r.estado === 'AUSENTE' ? '❌ INASISTENCIA' : r.estado}
                        </span>
                        {r.scan_time && (
                          <p className="text-[10px] text-gray-500 font-medium">🕒 {r.scan_time}</p>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-gray-500 font-semibold">
                    🏫 {r.sede || 'Sede 1'} ({r.fuente})
                  </td>

                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editObs}
                        onChange={(e) => setEditObs(e.target.value)}
                        placeholder="Escribe excusa u observación..."
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                      />
                    ) : r.observaciones ? (
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                        💬 {r.observaciones}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSaveEdit(r.session_id)}
                          disabled={loading}
                          className="px-2.5 py-1 bg-green-600 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-green-700 flex items-center gap-1"
                        >
                          {loading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
                        </button>
                        <button
                          onClick={() => setEditingSessionId(null)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(r)}
                        className="px-2.5 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ml-auto"
                      >
                        <Edit3 size={12} /> Editar Excusa
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
