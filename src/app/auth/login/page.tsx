'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/app/actions';
import Image from 'next/image';
import { Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
       router.push('/admin');
       router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex text-slate-800 bg-gray-50 flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <div className="relative w-20 h-20">
               <Image src="/FSM.png" alt="Logo FSM" fill className="object-contain" />
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-fsm-blue uppercase tracking-tighter">
          Panel de Control
        </h2>
        <p className="mt-2 text-center text-sm text-gray-900">
          Inicia sesión para gestionar el contenido.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
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
                  placeholder="admin@ejemplo.com"
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
              {loading ? 'Ingresando...' : 'INGRESAR'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
