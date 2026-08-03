"use client";

import React, { useState } from 'react';
import { Cpu, User, RefreshCw, AlertTriangle, Check, ArrowRight } from 'lucide-react';

interface Student {
  id: string;
  nombre: string;
  grado: string;
  rfid_tag_uid: string | null;
}

interface Reader {
  id: string;
  tipo: string;
  ubicacion: string;
}

interface SimulatorClientProps {
  students: Student[];
  readers: Reader[];
}

export default function SimulatorClient({ students, readers }: SimulatorClientProps) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedReaderId, setSelectedReaderId] = useState(readers[0]?.id || '');
  const [tipoEvento, setTipoEvento] = useState('entrada');
  const [customUid, setCustomUid] = useState('');
  const [useCustomUid, setUseCustomUid] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSimulate = async () => {
    setSimulating(true);
    setSimResult(null);
    setErrorMsg('');

    try {
      const payload: any = {
        reader_id: selectedReaderId,
        tipo_evento: tipoEvento
      };

      if (useCustomUid) {
        if (!customUid.trim()) {
          setErrorMsg('Por favor ingresa un UID personalizado.');
          setSimulating(false);
          return;
        }
        payload.tag_uid = customUid.trim();
      } else {
        if (!selectedStudentId) {
          setErrorMsg('Por favor selecciona un estudiante o activa la opción de UID personalizado.');
          setSimulating(false);
          return;
        }
        payload.student_id = selectedStudentId;
      }

      // Add mock geoloc if mobile reader is selected
      const selectedReader = readers.find(r => r.id === selectedReaderId);
      if (selectedReader?.tipo === 'mobile_nfc') {
        payload.geolocalizacion = "4.5966,-74.2202"; // Soacha Center coordinates
      }

      const res = await fetch('/api/attendance/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
      } else {
        setSimResult(data);
      }

    } catch (error: any) {
      setErrorMsg(error.message || 'Error en la conexión con el servidor');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Control Panel Card */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-premium space-y-6">
        <h3 className="text-xl font-black text-fsm-blue uppercase tracking-tight flex items-center gap-2">
          <Cpu className="text-fsm-red" />
          Consola del Simulador
        </h3>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 text-fsm-red border border-red-100 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle size={16} />
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          {/* Reader Selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Dispositivo de Lectura</label>
            <select
              value={selectedReaderId}
              onChange={e => setSelectedReaderId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-sm text-gray-700 outline-none"
            >
              {readers.map(r => (
                <option key={r.id} value={r.id}>
                  {r.ubicacion} ({r.tipo === 'mobile_nfc' ? 'PWA Móvil' : 'Lector Fijo'} - ID: {r.id})
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Tipo de Evento</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTipoEvento('entrada')}
                className={`py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${
                  tipoEvento === 'entrada'
                    ? 'bg-green-50 text-green-700 border-green-200 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setTipoEvento('salida')}
                className={`py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${
                  tipoEvento === 'salida'
                    ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Salida
              </button>
            </div>
          </div>

          {/* Tag UID Mode */}
          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="useCustomUid"
              checked={useCustomUid}
              onChange={e => setUseCustomUid(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-fsm-red focus:ring-fsm-red"
            />
            <label htmlFor="useCustomUid" className="text-xs font-bold text-gray-700 uppercase tracking-tight cursor-pointer">
              Simular tarjeta no registrada (UID Personalizado)
            </label>
          </div>

          {/* Student/Tag Selection */}
          {!useCustomUid ? (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Seleccionar Estudiante</label>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-sm text-gray-700 outline-none"
              >
                <option value="">Selecciona un estudiante...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.grado}] {s.nombre} {s.rfid_tag_uid ? `(UID: ${s.rfid_tag_uid})` : '(Sin tarjeta vinculada)'}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">UID de Tarjeta Personalizado (HEX)</label>
              <input
                type="text"
                placeholder="Ej: 04A2B3C4"
                value={customUid}
                onChange={e => setCustomUid(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-sm text-gray-700 outline-none uppercase"
              />
            </div>
          )}

          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="w-full py-4 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {simulating ? (
              <>
                <RefreshCw className="animate-spin" size={16} /> Procesando simulación...
              </>
            ) : (
              <>
                Enviar Escaneo Simulado <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Response Display Card */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-premium flex flex-col justify-between min-h-[400px]">
        <div>
          <h3 className="text-xl font-black text-fsm-blue uppercase tracking-tight mb-6">
            Respuesta del Sistema (Mock LCD feedback)
          </h3>
          
          {!simResult ? (
            <div className="h-64 rounded-[2rem] border border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <Cpu size={40} className="mb-3 opacity-30" />
              <p className="font-bold text-sm uppercase">Esperando acción de escaneo</p>
              <p className="text-xs mt-1 font-semibold">Configura los parámetros a la izquierda y presiona el botón para simular.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* LCD Style Success/Warning Box */}
              <div className={`p-6 rounded-[2rem] border flex items-center gap-4 ${
                simResult.scanResponse?.status === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  simResult.scanResponse?.status === 'success' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                }`}>
                  {simResult.scanResponse?.status === 'success' ? <Check size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div>
                  <span className="text-[9px] font-black tracking-widest uppercase opacity-75">Feedback de Terminal</span>
                  <h4 className="text-lg font-black uppercase leading-none mt-1">
                    {simResult.scanResponse?.status === 'success' ? 'Acceso Permitido' : 'Acceso Denegado'}
                  </h4>
                  <p className="text-xs font-semibold mt-1">
                    {simResult.scanResponse?.message}
                  </p>
                </div>
              </div>

              {/* Detail JSON Block */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Carga de Datos Enviada</span>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-2xl text-xs font-mono overflow-x-auto shadow-inner leading-relaxed">
{JSON.stringify({
  simulatedTagUid: simResult.simulatedTagUid,
  scanResponse: simResult.scanResponse
}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center pt-6 border-t border-gray-50">
          Fundación San Mateo • Hardware Integration Lab
        </div>
      </div>
    </div>
  );
}
