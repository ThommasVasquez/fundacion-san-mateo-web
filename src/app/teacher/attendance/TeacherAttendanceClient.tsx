"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Radio, CheckCircle2, AlertCircle, XCircle, LogOut, 
  Wifi, WifiOff, RefreshCw, Smartphone, Search, CreditCard, UserCheck, Hash
} from 'lucide-react';

interface Student {
  id: string;
  nombre: string;
  grado: string;
  rfid_tag_uid: string | null;
}

interface TeacherAttendanceClientProps {
  teacherName: string;
  teacherId: string;
  readerId: string;
  students: Student[];
}

interface ScannedRecord {
  id: string;
  nombre: string;
  grado: string;
  time: string;
  status: 'success' | 'unassigned' | 'error';
  message?: string;
}

// Emite un sonido de confirmación o alerta usando la Web Audio API nativa
function playBeep(type: 'success' | 'error') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}

export default function TeacherAttendanceClient({ 
  teacherName, 
  teacherId, 
  readerId, 
  students 
}: TeacherAttendanceClientProps) {
  const router = useRouter();
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [nfcActive, setNfcActive] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Registro activo actual
  const [currentResult, setCurrentResult] = useState<ScannedRecord | null>(null);
  // Historial de la sesión actual
  const [recentScans, setRecentScans] = useState<ScannedRecord[]>([]);

  const ndefReaderRef = useRef<any>(null);

  const [mode, setMode] = useState<'nfc' | 'manual'>('nfc');
  const [manualInput, setManualInput] = useState('');
  const [matchingStudents, setMatchingStudents] = useState<Student[]>([]);

  // 1. Detectar soporte y arrancar NFC automáticamente
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcSupported(true);
      autoStartNfc();
    } else {
      setNfcSupported(false);
      setMode('manual');
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (ndefReaderRef.current) {
        try {
          ndefReaderRef.current.onreading = null;
        } catch {}
      }
    };
  }, []);

  const autoStartNfc = async () => {
    try {
      const ndef = new (window as any).NDEFReader();
      ndefReaderRef.current = ndef;
      await ndef.scan();
      setNfcActive(true);

      ndef.onreading = async (event: any) => {
        const serial = event.serialNumber.replace(/:/g, '').toUpperCase();
        console.log(`NFC leída: ${serial}`);
        await processCardScan(serial);
      };

      ndef.onreadingerror = () => {
        playBeep('error');
        if ('vibrate' in navigator) navigator.vibrate([150, 100, 150]);
        setCurrentResult({
          id: String(Date.now()),
          nombre: 'Error de Lectura',
          grado: 'NFC',
          time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          status: 'error',
          message: 'No se pudo leer la tarjeta. Manténla quieta junto al teléfono.'
        });
      };
    } catch (err: any) {
      console.warn('Auto start NFC no permitido aún o requiere toque del usuario:', err);
      setNfcActive(false);
    }
  };

  const manualStartNfc = async () => {
    await autoStartNfc();
  };

  const handleInputChange = (text: string) => {
    setManualInput(text);
    const query = text.trim().toLowerCase();
    if (!query || query.length < 2) {
      setMatchingStudents([]);
      return;
    }
    const matches = students.filter(s => 
      s.nombre.toLowerCase().includes(query) ||
      (s.rfid_tag_uid && s.rfid_tag_uid.toLowerCase().includes(query))
    ).slice(0, 5);
    setMatchingStudents(matches);
  };

  const handleManualSubmit = async (e?: React.FormEvent, directUid?: string) => {
    if (e) e.preventDefault();
    const target = directUid || manualInput.trim();
    if (!target) return;
    setManualInput('');
    setMatchingStudents([]);
    await processCardScan(target);
  };

  // 2. Procesar lectura de tarjeta
  const processCardScan = async (tagUid: string) => {
    if (processing) return;
    setProcessing(true);

    const timeStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reader_id: readerId,
          tag_uid: tagUid,
          tipo_evento: 'entrada',
          registrado_por: teacherId
        })
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        playBeep('success');
        if ('vibrate' in navigator) navigator.vibrate(100);

        const record: ScannedRecord = {
          id: String(Date.now()),
          nombre: data.student?.nombre || 'Estudiante',
          grado: data.student?.grado || 'Sin Grado',
          time: timeStr,
          status: 'success',
          message: 'Entrada registrada con éxito'
        };

        setCurrentResult(record);
        setRecentScans(prev => [record, ...prev.slice(0, 9)]);
      } else if (data.status === 'student_inactive') {
        playBeep('error');
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);

        const record: ScannedRecord = {
          id: String(Date.now()),
          nombre: data.student?.nombre || 'Estudiante Aplazado',
          grado: data.student?.grado || 'Inactivo',
          time: timeStr,
          status: 'error',
          message: data.error || 'Estudiante inactivo / aplazado'
        };
        setCurrentResult(record);
        setRecentScans(prev => [record, ...prev.slice(0, 9)]);
      } else {
        // Tarjeta sin asignar u otro error
        playBeep('error');
        if ('vibrate' in navigator) navigator.vibrate([150, 100, 150]);

        // Verificar si la conocemos localmente
        const local = students.find(s => s.rfid_tag_uid === tagUid);

        const record: ScannedRecord = {
          id: String(Date.now()),
          nombre: local ? local.nombre : `Tarjeta: ${tagUid}`,
          grado: local ? local.grado : 'Sin Asignar',
          time: timeStr,
          status: 'unassigned',
          message: data.message || 'Tarjeta no registrada en el sistema'
        };
        setCurrentResult(record);
        setRecentScans(prev => [record, ...prev.slice(0, 9)]);
      }
    } catch (error: any) {
      playBeep('error');
      setCurrentResult({
        id: String(Date.now()),
        nombre: 'Error de Conexión',
        grado: 'Red',
        time: timeStr,
        status: 'error',
        message: 'No se pudo contactar el servidor. Verifique su conexión.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push('/auth/teacher-login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between selection:bg-fsm-red selection:text-white">
      {/* 1. Header Único: Nombre y Salir */}
      <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div>
          <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">
            DOCENTE EN SESIÓN
          </span>
          <h2 className="text-sm font-black uppercase text-white truncate max-w-[200px] sm:max-w-xs">
            {teacherName}
          </h2>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 text-xs font-black uppercase tracking-wider transition-all"
        >
          <LogOut size={14} /> Salir
        </button>
      </header>

      {/* 2. Cuerpo Central: LECTOR NFC / REGISTRO MANUAL */}
      <main className="flex-1 p-6 flex flex-col justify-center items-center max-w-md mx-auto w-full space-y-6">
        
        {/* Selector de Modo si NFC está soportado */}
        {nfcSupported !== false && (
          <div className="w-full flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 mb-2">
            <button
              onClick={() => setMode('nfc')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                mode === 'nfc' 
                  ? 'bg-emerald-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio size={14} /> Lector NFC
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                mode === 'manual' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search size={14} /> Manual / Cédula
            </button>
          </div>
        )}

        {/* Zona del Sensor NFC (cuando modo NFC activo) */}
        {mode === 'nfc' && (
          nfcSupported === false ? (
            <div className="w-full p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-center space-y-3">
              <Smartphone size={36} className="mx-auto text-amber-400" />
              <h3 className="font-black text-sm uppercase tracking-wide">NFC Web No Disponible</h3>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                La lectura NFC en navegador web requiere un celular Android con Google Chrome y sensor NFC encendido. En iPhone o PC puedes usar la entrada manual.
              </p>
              <button
                onClick={() => setMode('manual')}
                className="mt-3 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
              >
                Usar Registro Manual
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center text-center space-y-6">
              {/* Animación del Sensor */}
              <div className="relative flex items-center justify-center">
                <div className={`absolute w-44 h-44 rounded-full transition-all duration-1000 ${
                  nfcActive 
                    ? 'bg-emerald-500/20 animate-ping' 
                    : 'bg-slate-800'
                }`} />
                <div className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center border-2 transition-all ${
                  nfcActive 
                    ? 'bg-slate-800/90 border-emerald-500 text-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}>
                  <Radio size={42} className={nfcActive ? 'animate-pulse' : ''} />
                  <span className="text-[10px] font-black uppercase tracking-widest mt-1">
                    {nfcActive ? 'NFC LISTO' : 'NFC PAUSADO'}
                  </span>
                </div>
              </div>

              {!nfcActive && (
                <button
                  onClick={manualStartNfc}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                  Activar Lector NFC
                </button>
              )}

              {nfcActive && (
                <p className="text-xs font-semibold text-slate-400 max-w-xs">
                  Acerque la tarjeta o carnet del estudiante a la parte trasera del teléfono
                </p>
              )}
            </div>
          )
        )}

        {/* Modo Manual / Cédula / Tarjeta */}
        {mode === 'manual' && (
          <div className="w-full space-y-4">
            {nfcSupported === false && (
              <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl flex items-center gap-3">
                <Smartphone size={20} className="text-amber-400 shrink-0" />
                <p className="text-[11px] text-slate-300">
                  <strong className="text-amber-400">Modo Manual Activo:</strong> Puedes marcar asistencia ingresando la cédula, número de tarjeta o nombre.
                </p>
              </div>
            )}

            <form onSubmit={(e) => handleManualSubmit(e)} className="space-y-3">
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Buscar estudiante, cédula o tarjeta..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={processing || !manualInput.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2"
              >
                <UserCheck size={16} /> Marcar Asistencia
              </button>
            </form>

            {/* Sugerencias de Autocompletado */}
            {matchingStudents.length > 0 && (
              <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-2 space-y-1.5 shadow-xl">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                  Coincidencias ({matchingStudents.length})
                </div>
                {matchingStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => handleManualSubmit(undefined, student.rfid_tag_uid || student.id)}
                    disabled={processing}
                    className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/50 flex items-center justify-between text-left transition-all"
                  >
                    <div>
                      <p className="text-xs font-black text-white uppercase">{student.nombre}</p>
                      <p className="text-[10px] text-slate-400">{student.grado}</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
                      Marcar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tarjeta de Resultado Instantáneo */}
        {currentResult && (
          <div className={`w-full p-5 rounded-3xl border transition-all animate-in fade-in zoom-in-95 duration-200 ${
            currentResult.status === 'success' 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
              : currentResult.status === 'unassigned'
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-100'
              : 'bg-red-950/40 border-red-500/40 text-red-100'
          }`}>
            <div className="flex items-start gap-3.5">
              {currentResult.status === 'success' && <CheckCircle2 size={32} className="text-emerald-400 shrink-0 mt-0.5" />}
              {currentResult.status === 'unassigned' && <AlertCircle size={32} className="text-amber-400 shrink-0 mt-0.5" />}
              {currentResult.status === 'error' && <XCircle size={32} className="text-red-400 shrink-0 mt-0.5" />}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    currentResult.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                    currentResult.status === 'unassigned' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {currentResult.status === 'success' ? '✅ REGISTRADO' : currentResult.status === 'unassigned' ? '⚠️ NO VINCULADA' : '❌ ERROR'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{currentResult.time}</span>
                </div>

                <h3 className="text-base font-black uppercase tracking-tight text-white mt-1 truncate">
                  {currentResult.nombre}
                </h3>
                <p className="text-xs font-medium text-slate-300">
                  {currentResult.grado}
                </p>
                {currentResult.message && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    {currentResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Últimas lecturas en la sesión actual */}
        {recentScans.length > 0 && (
          <div className="w-full space-y-2 pt-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
              <span>Últimos Marcados ({recentScans.filter(s => s.status === 'success').length})</span>
              <span>Hora</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {recentScans.slice(0, 5).map(scan => (
                <div 
                  key={scan.id} 
                  className="px-3.5 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs"
                >
                  <div className="truncate max-w-[200px]">
                    <p className="font-bold text-slate-200 truncate uppercase">{scan.nombre}</p>
                    <p className="text-[9px] text-slate-400">{scan.grado}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">{scan.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 4. Footer Simple */}
      <footer className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-800">
        Fundación San Mateo Soacha · Control Asistencia NFC
      </footer>
    </div>
  );
}
