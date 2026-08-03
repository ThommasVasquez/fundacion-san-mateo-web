"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teacherLogin } from '@/app/actions';
import Image from 'next/image';
import { Lock, Mail, Smartphone } from 'lucide-react';

export default function TeacherLoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Listen for PWA installation prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('SW registered successfully:', reg.scope))
        .catch((err) => console.error('SW registration failed:', err));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const result = await teacherLogin(formData);
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
       router.push('/teacher/attendance');
       router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex text-slate-800 bg-gray-50 flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* PWA Install Promo */}
      {showInstallBtn && (
        <div className="max-w-md mx-auto w-full px-4 mb-6">
          <div className="bg-fsm-blue text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <Smartphone size={24} className="text-fsm-red animate-pulse" />
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider">Instala la App de Asistencia</h4>
                <p className="text-[10px] opacity-85">Acceso rápido y funcionamiento offline en prácticas.</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-fsm-red text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-fsm-red-deep transition-colors shadow-sm"
            >
              Instalar
            </button>
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <div className="relative w-20 h-20">
               <Image src="/FSM.png" alt="Logo FSM" fill className="object-contain" />
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-fsm-blue uppercase tracking-tighter">
          ASISTENCIA PRÁCTICAS
        </h2>
        <p className="mt-2 text-center text-sm text-gray-900 font-medium">
          Portal de asistencia para docentes y tutores.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow-premium sm:rounded-[2rem] sm:px-10 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-fsm-red/5 rounded-full "></div>
          
          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-gray-700 tracking-widest uppercase mb-2">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-700">
                   <Mail size={16} />
                </div>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full pl-10 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fsm-red focus:border-transparent outline-none transition-all"
                  placeholder="docente@fundacionsanmateo.edu.co"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 tracking-widest uppercase mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-700">
                   <Lock size={16} />
                </div>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fsm-red focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-fsm-blue hover:bg-fsm-red transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fsm-red disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'INICIAR SESIÓN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
