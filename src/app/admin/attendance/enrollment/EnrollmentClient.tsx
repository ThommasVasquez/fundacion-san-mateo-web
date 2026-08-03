"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setEnrollmentStudent, linkStudentTag, unlinkStudentTag } from '@/app/actions';
import { 
  Tag, Search, AlertTriangle, ArrowLeft, RefreshCw, 
  Check, X, Link as LinkIcon, AlertCircle, Plus
} from 'lucide-react';
import Link from 'next/link';

interface Student {
  id: string;
  nombre: string;
  grado: string;
  rfid_tag_uid: string | null;
  activo: boolean;
}

interface EnrollmentClientProps {
  students: Student[];
  activeStudentId: string | null;
  pendingUid?: string;
}

export default function EnrollmentClient({ students, activeStudentId, pendingUid = '' }: EnrollmentClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterGrado, setFilterGrado] = useState('');
  const [manualUidMap, setManualUidMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Get active student details
  const activeStudent = students.find(s => s.id === activeStudentId);

  // Poll database every 3 seconds to see if enrollment succeeded (i.e. tag_uid was written and activeStudentId was cleared)
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

  const handleUnlink = async (studentId: string) => {
    if (!confirm('¿Estás seguro de que quieres desvincular esta tarjeta?')) return;

    setLoading(prev => ({ ...prev, [studentId]: true }));
    const res = await unlinkStudentTag(studentId);
    setLoading(prev => ({ ...prev, [studentId]: false }));

    if (res.success) {
      showStatus('Tarjeta desvinculada con éxito.');
      router.refresh();
    } else {
      showStatus(res.error || 'Error al desvincular', 'error');
    }
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

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.nombre.toLowerCase().includes(search.toLowerCase()) || 
                          (s.rfid_tag_uid && s.rfid_tag_uid.toLowerCase().includes(search.toLowerCase()));
    const matchesGrado = !filterGrado || s.grado === filterGrado;
    return matchesSearch && matchesGrado;
  });

  // Get distinct grades
  const grades = Array.from(new Set(students.map(s => s.grado))).sort();

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
        
        <div className="text-xs font-black text-gray-500 uppercase tracking-widest">
          Estudiantes: {filteredStudents.length} / {students.length}
        </div>
      </div>

      {/* Student List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center text-sm font-medium text-gray-400 rounded-[2rem] border border-gray-100 shadow-premium">
            No se encontraron estudiantes que coincidan con la búsqueda.
          </div>
        ) : (
          filteredStudents.map(student => {
            const isPendingLink = pendingUid && !student.rfid_tag_uid;
            
            return (
              <div 
                key={student.id} 
                className={`bg-white p-6 rounded-[2rem] border shadow-premium transition-all duration-300 flex flex-col justify-between gap-6 ${
                  isPendingLink ? 'border-yellow-200 bg-yellow-50/10' : 'border-gray-100 hover:border-fsm-blue/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black text-fsm-blue uppercase bg-fsm-blue/5 px-2 py-0.5 rounded">
                      Grado: {student.grado}
                    </span>
                    <h4 className="text-lg font-black text-fsm-blue uppercase mt-1 leading-tight">{student.nombre}</h4>
                    {student.rfid_tag_uid ? (
                      <p className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1">
                        <Check size={14} /> Tarjeta vinculada: <span className="font-mono bg-green-50 px-2 py-0.5 rounded text-[10px]">{student.rfid_tag_uid}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle size={14} className="text-gray-400" /> Sin tarjeta vinculada
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-gray-50">
                  {student.rfid_tag_uid ? (
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
      </div>
    </div>
  );
}
