"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordManualAttendance } from '@/app/actions';
import { 
  UserCheck, Search, X, Check, AlertTriangle, UserX, Clock, LogOut
} from 'lucide-react';

interface StudentItem {
  id: string;
  nombre: string;
  grado: string;
  activo: boolean;
}

interface ManualAttendanceModalProps {
  students: StudentItem[];
}

export default function ManualAttendanceModal({ students }: ManualAttendanceModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSede, setSelectedSede] = useState('Sede 1');
  const [observaciones, setObservaciones] = useState('');
  const [filterGrado, setFilterGrado] = useState('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 5000);
  };

  const handleMarkAttendance = async (student: StudentItem, tipoEvento: 'entrada' | 'salida') => {
    setLoading(prev => ({ ...prev, [student.id]: true }));
    try {
      const res = await recordManualAttendance(student.id, tipoEvento, selectedSede, observaciones);
      if (res && res.success) {
        showStatus(`✓ ${tipoEvento === 'salida' ? 'Salida' : 'Entrada'} marcada correctamente para ${student.nombre} (${student.grado}) en ${selectedSede}.`);
        router.refresh();
      } else {
        showStatus(res?.error || 'Error al registrar asistencia', 'error');
      }
    } catch (err: any) {
      console.error('Manual attendance error:', err);
      showStatus('Error de comunicación con el servidor. Por favor intenta de nuevo.', 'error');
    } finally {
      setLoading(prev => ({ ...prev, [student.id]: false }));
    }
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    const term = search.toLowerCase();
    const matchesSearch = s.nombre.toLowerCase().includes(term) || s.grado.toLowerCase().includes(term);
    const matchesGrado = !filterGrado || s.grado === filterGrado;
    return matchesSearch && matchesGrado;
  });

  const grades = Array.from(new Set(students.map(s => s.grado))).sort((a, b) => 
    a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2"
      >
        <UserCheck size={16} /> Entrada Manual (Sin Carnet)
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden w-full max-w-2xl p-8 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 shrink-0">
              <div>
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  REGISTRO DE EMERGENCIA / SIN CARNET
                </span>
                <h3 className="text-xl font-black text-fsm-blue uppercase leading-tight mt-1.5">
                  MARCAR ENTRADA MANUAL
                </h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-fsm-red transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Status Alert Banner */}
            {statusMsg.text && (
              <div className={`p-4 rounded-xl border font-bold text-xs uppercase tracking-widest shrink-0 ${
                statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-fsm-red border-red-200'
              }`}>
                {statusMsg.text}
              </div>
            )}

            {/* Sede and Observaciones Configuration Bar */}
            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-blue-200">
                  <span className="text-[10px] font-black text-fsm-blue uppercase tracking-wider">🏫 Sede:</span>
                  <select
                    value={selectedSede}
                    onChange={e => setSelectedSede(e.target.value)}
                    className="bg-transparent font-black text-xs uppercase text-fsm-blue outline-none cursor-pointer"
                  >
                    <option value="Sede 1">Sede 1</option>
                    <option value="Sede 2">Sede 2</option>
                  </select>
                </div>

                <div className="flex-1 bg-white px-3 py-2 rounded-xl border border-blue-200">
                  <input
                    type="text"
                    placeholder="💬 Observación (ej. Sin carnet físico, permiso médico)..."
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-800 placeholder-gray-400 outline-none w-full"
                  />
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 flex-1">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar estudiante por nombre o grado..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent font-bold text-xs text-gray-700 outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full sm:w-48">
                <select
                  value={filterGrado}
                  onChange={e => setFilterGrado(e.target.value)}
                  className="bg-transparent font-bold text-xs uppercase text-gray-700 outline-none w-full"
                >
                  <option value="">Todos los Grados</option>
                  {grades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[250px]">
              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-xs font-medium text-gray-400">
                  No se encontraron estudiantes para registrar.
                </div>
              ) : (
                filteredStudents.map(student => {
                  return (
                    <div 
                      key={student.id} 
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        !student.activo 
                          ? 'bg-amber-50/40 border-amber-200 opacity-60' 
                          : 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-fsm-blue uppercase bg-fsm-blue/5 px-2 py-0.5 rounded">
                            Grado: {student.grado}
                          </span>
                          {!student.activo && (
                            <span className="text-[9px] font-black text-amber-800 uppercase bg-amber-100 px-2 py-0.5 rounded">
                              ❄️ CONGELADO / APLAZADO
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black text-fsm-blue uppercase mt-0.5">{student.nombre}</h4>
                      </div>

                      {student.activo ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleMarkAttendance(student, 'entrada')}
                            disabled={loading[student.id]}
                            className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            <Check size={13} /> Entrada
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student, 'salida')}
                            disabled={loading[student.id]}
                            className="px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            <LogOut size={13} /> Salida
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                          <UserX size={14} /> Inactivo
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100 shrink-0">
              <span className="text-[11px] font-semibold text-gray-400">
                Se registrará como evento de origen &quot;Manual&quot; con la hora actual.
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
