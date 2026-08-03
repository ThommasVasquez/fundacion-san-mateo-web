import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/auth';
import { logout } from '@/app/actions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = (await cookies()).get('session')?.value;

  if (!session) {
    redirect('/auth/login');
  }

  try {
    const parsed = await decrypt(session);
    if (!parsed || !parsed.adminId) {
      redirect('/auth/login');
    }
  } catch (error) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4 px-8 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="font-black text-xl text-fsm-blue flex items-center gap-2">
            <span className="w-8 h-8 bg-fsm-red text-white flex items-center justify-center rounded-lg text-sm">F</span>
            Panel de Control
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
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
             <Link href="/admin/attendance" className="px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue">
               Asistencia
             </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
           <Link href="/blog" target="_blank" className="text-gray-700 hover:text-fsm-blue text-xs font-bold uppercase tracking-widest mr-4">Vista Blog</Link>
           <Link href="/" target="_blank" className="text-gray-700 hover:text-fsm-blue text-xs font-bold uppercase tracking-widest">Ver Sitio</Link>
           <div className="w-px h-4 bg-gray-200 mx-2"></div>
           <form action={async () => { "use server"; await logout(); redirect("/auth/login"); }}>
             <button type="submit" className="text-fsm-red text-xs font-black tracking-widest uppercase hover:opacity-70 transition-opacity">Salir</button>
           </form>
        </div>
      </header>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
