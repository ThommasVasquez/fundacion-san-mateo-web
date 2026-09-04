import { Layout, FileText, HelpCircle, Users, Tag, FileCheck, QrCode, ShieldCheck, History } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = (await cookies()).get('session')?.value;
  let parsed = null;
  if (session) {
    try {
      parsed = await decrypt(session);
    } catch {}
  }

  if (parsed?.role === 'academic' || parsed?.email === 'sacademica@fundacionsanmateosoacha.edu.co') {
    redirect('/admin/attendance');
  }

  const userEmail = (parsed?.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === 'admin@fundacionsanmateo.edu.co' || userEmail === 'admin@fundacionsanmateosoacha.edu.co';

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-fsm-blue tracking-tighter uppercase">Gestor Educativo</h1>
          <p className="text-gray-900 mt-2 font-medium">Administra el alma digital de la Fundación San Mateo.</p>
        </div>
      </div>
      
      <div className="pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Documentos y QR */}
          <Link 
            href="/admin/documents" 
            className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-premium border-2 border-fsm-blue/20 hover:border-fsm-blue hover:shadow-xl transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-fsm-blue/5 rounded-full blur-xl -mr-6 -mt-6"></div>
            <div className="w-14 h-14 bg-fsm-blue text-white rounded-2xl flex items-center justify-center group-hover:bg-fsm-red transition-all shadow-md">
              <QrCode size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-fsm-red uppercase leading-none mb-1">Certificación Oficial</p>
              <h3 className="text-lg font-black text-fsm-blue uppercase tracking-tight">Documentos y QR</h3>
            </div>
          </Link>

          {/* 2. Control de Asistencia */}
          <Link 
            href="/admin/attendance" 
            className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 hover:border-fsm-red/20 transition-all group"
          >
            <div className="w-14 h-14 bg-fsm-blue/5 rounded-2xl flex items-center justify-center text-fsm-blue group-hover:bg-fsm-red group-hover:text-white transition-all">
              <Users size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase leading-none mb-1">Control de Accesos</p>
              <h3 className="text-lg font-black text-fsm-blue uppercase tracking-tight">Control de Asistencia</h3>
            </div>
          </Link>

          {/* 3. Matrícula y Tarjetas */}
          <Link 
            href="/admin/attendance/enrollment" 
            className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 hover:border-fsm-red/20 transition-all group"
          >
            <div className="w-14 h-14 bg-fsm-blue/5 rounded-2xl flex items-center justify-center text-fsm-blue group-hover:bg-fsm-red group-hover:text-white transition-all">
              <Tag size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase leading-none mb-1">Registro NFC/RFID</p>
              <h3 className="text-lg font-black text-fsm-blue uppercase tracking-tight">Matrícula y Alumnos</h3>
            </div>
          </Link>

          {/* 4. Gestor Global / Inicio */}
          <Link 
            href="/admin/pages/home" 
            className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 hover:border-fsm-red/20 transition-all group"
          >
            <div className="w-14 h-14 bg-fsm-blue/5 rounded-2xl flex items-center justify-center text-fsm-blue group-hover:bg-fsm-red group-hover:text-white transition-all">
              <Layout size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase leading-none mb-1">Editor Visual</p>
              <h3 className="text-lg font-black text-fsm-blue uppercase tracking-tight">Gestor Global</h3>
            </div>
          </Link>

          {/* 5. Gestionar Blog */}
          <Link 
            href="/admin/blog" 
            className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 hover:border-fsm-red/20 transition-all group"
          >
            <div className="w-14 h-14 bg-fsm-blue/5 rounded-2xl flex items-center justify-center text-fsm-blue group-hover:bg-fsm-red group-hover:text-white transition-all">
              <FileText size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase leading-none mb-1">Publicaciones</p>
              <h3 className="text-lg font-black text-fsm-blue uppercase tracking-tight">Gestionar Blog</h3>
            </div>
          </Link>

          {/* 6. Preguntas Frecuentes */}
          <Link 
            href="/admin/faqs" 
            className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-premium border border-gray-100 hover:border-fsm-red/20 transition-all group"
          >
            <div className="w-14 h-14 bg-fsm-blue/5 rounded-2xl flex items-center justify-center text-fsm-blue group-hover:bg-fsm-red group-hover:text-white transition-all">
              <HelpCircle size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase leading-none mb-1">Ayuda y Soporte</p>
              <h3 className="text-lg font-black text-fsm-blue uppercase tracking-tight">Preguntas Frecuentes</h3>
            </div>
          </Link>

          {/* 7. SuperAdmin: LOGS y Auditoría */}
          {isSuperAdmin && (
            <Link 
              href="/admin/logs" 
              className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-premium border-2 border-indigo-200 hover:border-indigo-600 transition-all group"
            >
              <div className="w-14 h-14 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <History size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest text-indigo-600 uppercase leading-none mb-1">Seguridad & Trazabilidad</p>
                <h3 className="text-lg font-black text-indigo-950 uppercase tracking-tight">LOGS & Auditoría</h3>
              </div>
            </Link>
          )}
      </div>
    </div>
  );
}
