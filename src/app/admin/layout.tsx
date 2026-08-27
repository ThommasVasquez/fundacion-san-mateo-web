import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/auth';
import { logout } from '@/app/actions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = (await cookies()).get('session')?.value;

  if (!session) {
    redirect('/auth/login');
  }

  let isAcademicRole = false;
  try {
    const parsed = await decrypt(session);
    if (!parsed || !parsed.adminId) {
      redirect('/auth/login');
    }
    isAcademicRole = parsed.role === 'academic' || parsed.email === 'sacademica@fundacionsanmateosoacha.edu.co';
  } catch (error) {
    redirect('/auth/login');
  }

  const defaultHomeLink = isAcademicRole ? '/admin/attendance' : '/admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4 px-8 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href={defaultHomeLink} className="font-black text-xl text-fsm-blue flex items-center gap-2.5 group">
            <Image src="/FSM.png" alt="Escudo Fundación San Mateo" width={36} height={36} className="w-9 h-9 object-contain group-hover:scale-105 transition-transform" />
            <span>Panel {isAcademicRole ? 'Académico' : 'de Control'}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
             {!isAcademicRole && (
               <>
                 <Link href="/admin" className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue">
                   Contenido
                 </Link>
                 <Link href="/admin/pages/home" className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue">
                   Inicio
                 </Link>
                 <Link href="/admin/blog" className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue">
                   Blog
                 </Link>
                 <Link href="/admin/faqs" className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue">
                   FAQs
                 </Link>
               </>
             )}
             <Link href="/admin/attendance" className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue">
               Asistencia
             </Link>
             <Link href="/admin/attendance/absences" className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-blue-50 text-fsm-blue hover:bg-fsm-blue hover:text-white transition-all border border-blue-200">
               📋 Alertas de Ausencias
             </Link>
             <Link href="/admin/attendance/enrollment" className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue">
               Matrícula y Alumnos
             </Link>
             <Link href="/admin/documents" className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue">
               Documentos y QR
             </Link>
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
      <footer className="bg-white border-t border-gray-200 py-4 px-8 text-xs font-medium text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Image src="/FSM.png" alt="Fundación San Mateo" width={22} height={22} className="w-5 h-5 object-contain" />
          <span className="font-bold text-gray-700">&copy; {new Date().getFullYear()} Fundación San Mateo • Soacha</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400">
          <span>Sistema de Control de Asistencia y Gestión Académica</span>
        </div>
      </footer>
    </div>
  );
}
