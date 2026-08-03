"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Smartphone, Search, Radio, CheckCircle, Wifi, WifiOff, 
  MapPin, LogOut, ArrowRight, UserCheck, RefreshCw, AlertTriangle
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

// Offline IndexedDB utilities
const DB_NAME = 'fsm_attendance_offline_db';
const STORE_NAME = 'pending_scans';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e: any) => reject(e.target.error);
  });
}

export default function TeacherAttendanceClient({ teacherName, teacherId, readerId, students }: TeacherAttendanceClientProps) {
  const router = useRouter();
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const [search, setSearch] = useState('');
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Status message
  const [status, setStatus] = useState({ text: '', type: '' });
  const [lastScannedStudent, setLastScannedStudent] = useState<any>(null);

  // Web NFC objects
  const ndefReaderRef = useRef<any>(null);

  useEffect(() => {
    // 1. Check NFC support
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcSupported(true);
    }

    // 2. Online status checks
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. Check queue size
    updateQueueCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateQueueCount = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        setOfflineCount(req.result.length);
      };
    } catch (e) {
      console.error('Error counting queue:', e);
    }
  };

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatus({ text, type });
    setTimeout(() => setStatus({ text: '', type: '' }), 5000);
  };

  // NFC Scan handler
  const startNfcScan = async () => {
    if (nfcReading) return;

    try {
      setNfcReading(true);
      const ndef = new (window as any).NDEFReader();
      ndefReaderRef.current = ndef;
      await ndef.scan();
      
      showStatus('Lector NFC activado. Acerca una tarjeta a la parte trasera del celular.', 'info');

      ndef.onreading = async (event: any) => {
        const serialNumber = event.serialNumber.replace(/:/g, '').toUpperCase();
        console.log(`NFC card read: ${serialNumber}`);
        await handleScanIngested(serialNumber, 'entrada');
      };

      ndef.onreadingerror = () => {
        showStatus('Error al leer la tarjeta. Inténtalo de nuevo.', 'error');
      };

    } catch (error: any) {
      console.error('NFC error:', error);
      showStatus(`No se pudo iniciar el NFC: ${error.message || String(error)}`, 'error');
      setNfcReading(false);
    }
  };

  const stopNfcScan = () => {
    setNfcReading(false);
    showStatus('Lector NFC desactivado.', 'info');
  };

  // Sync offline records
  const triggerSync = async () => {
    if (!navigator.onLine || syncing) return;
    
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = async () => {
        const queued = req.result;
        if (queued.length === 0) return;

        setSyncing(true);
        showStatus(`Sincronizando ${queued.length} registros offline...`, 'info');

        let successCount = 0;
        for (const scan of queued) {
          try {
            const res = await fetch('/api/attendance/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reader_id: scan.reader_id,
                tag_uid: scan.tag_uid,
                tipo_evento: scan.tipo_evento,
                timestamp: scan.timestamp,
                geolocalizacion: scan.geolocalizacion,
                registrado_por: scan.registrado_por
              })
            });

            if (res.ok) {
              // Remove from db
              const writeTx = db.transaction(STORE_NAME, 'readwrite');
              writeTx.objectStore(STORE_NAME).delete(scan.id);
              successCount++;
            }
          } catch (e) {
            console.error('Error syncing individual scan:', e);
          }
        }

        setSyncing(false);
        updateQueueCount();
        if (successCount > 0) {
          showStatus(`Sincronización completa. ${successCount} registros subidos con éxito.`, 'success');
        }
      };
    } catch (e) {
      console.error('Sync failed:', e);
      setSyncing(false);
    }
  };

  // Ingest scan (handles online vs offline)
  const handleScanIngested = async (tagUid: string, tipo: 'entrada' | 'salida', studentId?: string) => {
    const scanId = Math.random().toString(36).substring(2, 9) + Date.now();
    const timestamp = new Date().toISOString();
    
    // Attempt GPS coordinate retrieval
    let geolocalizacion = null;
    try {
      const pos: any = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 });
      });
      geolocalizacion = `${pos.coords.latitude},${pos.coords.longitude}`;
    } catch (e) {
      console.log('GPS coordinates not available, proceeding without GPS');
    }

    const payload = {
      id: scanId,
      reader_id: readerId,
      tag_uid: tagUid,
      tipo_evento: tipo,
      timestamp,
      geolocalizacion,
      registrado_por: teacherId
    };

    if (!isOnline) {
      // Offline mode: save in IndexedDB
      try {
        const db = await openDB();
        const writeTx = db.transaction(STORE_NAME, 'readwrite');
        writeTx.objectStore(STORE_NAME).add(payload);
        
        writeTx.oncomplete = () => {
          updateQueueCount();
          // Find student locally for display
          const matched = students.find(s => s.rfid_tag_uid === tagUid || s.id === studentId);
          setLastScannedStudent({
            nombre: matched ? matched.nombre : 'Tarjeta no asignada (Offline)',
            grado: matched ? matched.grado : 'N/A',
            tipo_evento: tipo,
            timestamp,
            offline: true
          });
          showStatus('Asistencia guardada localmente (Offline).', 'success');
        };
      } catch (err) {
        showStatus('Error al guardar localmente offline.', 'error');
      }
    } else {
      // Online mode: send direct POST
      try {
        const res = await fetch('/api/attendance/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (data.status === 'success') {
          setLastScannedStudent({
            nombre: data.student.nombre,
            grado: data.student.grado,
            tipo_evento: tipo,
            timestamp
          });
          showStatus(`Asistencia (${tipo}) registrada con éxito.`);
        } else if (data.status === 'unassigned') {
          setLastScannedStudent({
            nombre: 'Tarjeta Sin Asignar',
            grado: 'N/A',
            tipo_evento: tipo,
            timestamp
          });
          showStatus('La tarjeta leída no está asignada. Evento guardado para revisión.', 'info');
        } else {
          showStatus(data.error || 'Error al procesar asistencia', 'error');
        }
      } catch (err) {
        showStatus('Error de red. Guardando en cola local...', 'error');
        // Fallback to queue offline
        handleScanIngested(tagUid, tipo, studentId);
      }
    }
  };

  const handleManualAction = async (student: Student, tipo: 'entrada' | 'salida') => {
    // Generate simulated tag UID if not linked
    const tagUid = student.rfid_tag_uid || `MANUAL-${student.id.substring(0, 8).toUpperCase()}`;
    await handleScanIngested(tagUid, tipo, student.id);
  };

  // Filter student list
  const filteredStudents = students.filter(s => 
    s.nombre.toLowerCase().includes(search.toLowerCase()) || 
    (s.rfid_tag_uid && s.rfid_tag_uid.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Mobile Bar */}
      <header className="bg-fsm-blue text-white sticky top-0 z-50 px-6 py-4 shadow-premium flex items-center justify-between">
        <div>
          <span className="text-[8px] font-black tracking-widest text-fsm-red uppercase bg-white/10 px-2 py-0.5 rounded">
            Tutor de Prácticas
          </span>
          <h2 className="text-sm font-black uppercase mt-1 leading-none">{teacherName}</h2>
        </div>
        <button
          onClick={async () => {
            // Trigger logout action by redirecting or clearing session
            document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
            router.push('/auth/teacher-login');
            router.refresh();
          }}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-fsm-red flex items-center justify-center text-white transition-all"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 p-6 max-w-lg mx-auto w-full space-y-6 pb-24">
        {/* Status Indicators */}
        <div className="flex justify-between items-center gap-4">
          {/* Connection badge */}
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
              <Wifi size={12} /> Conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-fsm-red border border-red-200 animate-pulse">
              <WifiOff size={12} /> Offline
            </span>
          )}

          {/* Sync Queue badge */}
          {offlineCount > 0 && (
            <button
              onClick={triggerSync}
              disabled={syncing || !isOnline}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-50 text-yellow-800 border border-yellow-200 hover:bg-yellow-100 transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              Pendientes: {offlineCount}
            </button>
          )}
        </div>

        {/* Global Alert Notification */}
        {status.text && (
          <div className={`p-4 rounded-xl border font-bold text-xs uppercase tracking-widest text-center ${
            status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' :
            status.type === 'error' ? 'bg-red-50 text-fsm-red border-red-100' : 'bg-blue-50 text-fsm-blue border-blue-100'
          }`}>
            {status.text}
          </div>
        )}

        {/* Live Feedback Feed (Last Scanned Student) */}
        {lastScannedStudent && (
          <div className={`p-6 rounded-[2rem] border shadow-premium flex items-center gap-4 ${
            lastScannedStudent.offline ? 'bg-yellow-50/55 border-yellow-100 text-yellow-900' : 'bg-green-50/55 border-green-100 text-green-900'
          }`}>
            <CheckCircle size={32} className={lastScannedStudent.offline ? 'text-yellow-600' : 'text-green-600'} />
            <div>
              <span className="text-[9px] font-black tracking-widest uppercase opacity-70">
                Última asistencia {lastScannedStudent.offline && '(Guardado Offline)'}
              </span>
              <h4 className="text-base font-black uppercase mt-0.5">{lastScannedStudent.nombre}</h4>
              <p className="text-xs font-semibold">
                Grado: {lastScannedStudent.grado} | Acción: <strong className="uppercase">{lastScannedStudent.tipo_evento}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Web NFC Scanner Panel */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium space-y-6">
          <div className="flex items-center gap-3 text-fsm-blue">
            <Radio size={24} className="text-fsm-red animate-ping" />
            <h3 className="text-base font-black uppercase tracking-tight">Escáner NFC por Proximidad</h3>
          </div>

          {nfcSupported ? (
            <div className="space-y-4">
              <p className="text-xs font-medium text-gray-500 leading-relaxed">
                Usa la antena NFC del celular para leer las tarjetas NTAG213/MIFARE de los estudiantes directamente.
              </p>
              
              {!nfcReading ? (
                <button
                  onClick={startNfcScan}
                  className="w-full py-4 bg-fsm-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-fsm-red transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Smartphone size={16} /> Activar Lector NFC
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-red-50 text-fsm-red font-bold text-xs uppercase tracking-widest border border-red-100 text-center animate-pulse">
                    🔴 Lector NFC Escuchando Tarjetas...
                  </div>
                  <button
                    onClick={stopNfcScan}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Detener Lector
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100 space-y-2">
              <p className="text-xs font-bold uppercase flex items-center gap-1.5">
                <AlertTriangle size={14} /> Web NFC No Disponible
              </p>
              <p className="text-[10px] leading-relaxed opacity-90 font-medium">
                Tu navegador o dispositivo no soporta la lectura NFC (requiere Chrome en Android). Utiliza el registro manual abajo.
              </p>
            </div>
          )}
        </div>

        {/* Manual Fallback List Panel */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-premium space-y-6">
          <h3 className="text-base font-black uppercase tracking-tight text-fsm-blue">
            Buscador y Registro Manual
          </h3>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent font-bold text-xs text-gray-700 outline-none w-full"
            />
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-xs font-medium text-gray-400 py-6">
                No se encontraron estudiantes
              </p>
            ) : (
              filteredStudents.map(student => (
                <div key={student.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-3 justify-between">
                  <div>
                    <h4 className="text-xs font-black text-fsm-blue uppercase">{student.nombre}</h4>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Grado: {student.grado}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleManualAction(student, 'entrada')}
                      className="py-2 bg-white text-green-700 border border-green-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-green-700 hover:text-white transition-all"
                    >
                      Entrada
                    </button>
                    <button
                      onClick={() => handleManualAction(student, 'salida')}
                      className="py-2 bg-white text-orange-700 border border-orange-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-orange-700 hover:text-white transition-all"
                    >
                      Salida
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Bottom Footer Info */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-3 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest z-40">
        Fundación San Mateo Soacha
      </footer>
    </div>
  );
}
