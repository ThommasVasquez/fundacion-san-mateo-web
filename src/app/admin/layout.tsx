import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/auth';
import { logout } from '@/app/actions';
import Footer from '@/components/layout/Footer';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = (await cookies()).get('session')?.value;

  let parsed = null;
  if (session) {
    try {
      parsed = await decrypt(session);
    } catch {
      parsed = null;
    }
  }

  if (!parsed || !parsed.adminId) {
    redirect('/auth/login');
  }

  const isAcademicRole = parsed.role === 'academic' || parsed.email === 'sacademica@fundacionsanmateosoacha.edu.co';
  const userEmail = (parsed.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === 'admin@fundacionsanmateo.edu.co' || userEmail === 'admin@fundacionsanmateosoacha.edu.co';

  const defaultHomeLink = isAcademicRole ? '/admin/attendance' : '/admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4 px-8 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href={defaultHomeLink} className="font-black text-xl text-fsm-blue flex items-center gap-2.5 group">
            <Image src="/FSM.png" alt="Escudo Fundación San Mateo" width={36} height={36} className="w-9 h-9 object-contain group-hover:scale-105 transition-transform" />
            <span>Panel {isAcademicRole ? 'Académico' : 'de Control'}</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-3xl">
             {!isAcademicRole && (
               <>
                 <Link href="/admin" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                   Contenido
                 </Link>
                 <Link href="/admin/pages/home" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                   Inicio
                 </Link>
                 <Link href="/admin/blog" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                   Blog
                 </Link>
                 <Link href="/admin/faqs" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                   FAQs
                 </Link>
               </>
             )}
              <Link href="/admin/attendance" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                Asistencia
              </Link>
              <Link href="/admin/attendance/alerts" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-amber-50 text-amber-900 hover:bg-amber-600 hover:text-white transition-all border border-amber-200 shrink-0">
                📊 Planillas
              </Link>
              <Link href="/admin/attendance/absences" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-blue-50 text-fsm-blue hover:bg-fsm-blue hover:text-white transition-all border border-blue-200 shrink-0">
                📋 Alertas
              </Link>
             <Link href="/admin/attendance/enrollment" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
               Matrícula
             </Link>
              <Link href="/admin/documents" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-teal-50 text-teal-900 hover:bg-teal-700 hover:text-white transition-all border border-teal-200 shadow-2xs shrink-0 font-bold">
                📜 Documentos y QR
              </Link>
              {!isAcademicRole && (
                <Link href="/admin/users" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-purple-50 text-purple-800 hover:bg-purple-600 hover:text-white transition-all border border-purple-200 shrink-0">
                  👥 Usuarios
                </Link>
              )}
              {isSuperAdmin && (
                <Link href="/admin/logs" className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-indigo-50 text-indigo-900 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-200 shadow-2xs shrink-0">
                  📜 LOGS
                </Link>
              )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
           {!isAcademicRole && (
             <>
               <Link href="/blog" target="_blank" className="text-gray-700 hover:text-fsm-blue text-xs font-bold uppercase tracking-widest mr-4">Vista Blog</Link>
               <Link href="/" target="_blank" className="text-gray-700 hover:text-fsm-blue text-xs font-bold uppercase tracking-widest">Ver Sitio</Link>
               <div className="w-px h-4 bg-gray-200 mx-2"></div>
             </>
           )}
           <form action={async () => { "use server"; await logout(); redirect("/auth/login"); }}>
             <button type="submit" className="text-fsm-red text-xs font-black tracking-widest uppercase hover:opacity-70 transition-opacity">Salir</button>
           </form>
        </div>
      </header>
      <main className="flex-1 p-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
