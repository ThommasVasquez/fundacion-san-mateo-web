import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/auth';
import { logout } from '@/app/actions';
import Footer from '@/components/layout/Footer';
import { 
  getEffectivePermissions, 
  isSuperAdminEmail, 
  getUserDefaultRoute 
} from '@/lib/permissions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = (await cookies()).get('session')?.value;

  let parsed: any = null;
  if (session) {
    try {
      parsed = await decrypt(session);
    } catch {
      parsed = null;
    }
  }

  if (!parsed || (!parsed.adminId && !parsed.teacherId)) {
    redirect('/auth/login');
  }

  const userEmail = (parsed.email || '').toLowerCase().trim();
  const userRole = (parsed.role || 'custom').toLowerCase().trim();
  const isSuperAdmin = isSuperAdminEmail(userEmail);
  const isAdmin = userRole === 'admin' || isSuperAdmin;
  const permissions = getEffectivePermissions(userRole, parsed.permissions);

  // Capacidades efectivas
  const canCms = isAdmin || permissions.includes('cms_manage');
  const canAttendanceView = isAdmin || permissions.includes('attendance_view') || permissions.includes('attendance_edit');
  const canStudents = isAdmin || permissions.includes('students_manage');
  const canDocuments = isAdmin || permissions.includes('documents_manage');
  const canUsers = isAdmin || permissions.includes('users_manage');

  const defaultHomeLink = getUserDefaultRoute(userRole, permissions, userEmail);

  // Etiqueta visual de rol
  let roleBadge = { text: '⚙️ Personalizado', bg: 'bg-gray-100 text-gray-700 border-gray-200' };
  if (isSuperAdmin) {
    roleBadge = { text: '🛡️ SuperAdmin', bg: 'bg-red-50 text-fsm-red border-red-200 font-black' };
  } else if (isAdmin) {
    roleBadge = { text: '👑 Admin Total', bg: 'bg-purple-50 text-purple-900 border-purple-200 font-bold' };
  } else if (userRole === 'academic') {
    roleBadge = { text: '📋 Secretaría', bg: 'bg-blue-50 text-fsm-blue border-blue-200 font-bold' };
  } else if (userRole === 'coordinator') {
    roleBadge = { text: '🎓 Coordinación', bg: 'bg-amber-50 text-amber-900 border-amber-200 font-bold' };
  } else if (userRole === 'teacher') {
    roleBadge = { text: '👨‍🏫 Docente', bg: 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold' };
  }

  const userNameDisplay = parsed.nombre || userEmail.split('@')[0];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-3 px-6 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href={defaultHomeLink} className="font-black text-xl text-fsm-blue flex items-center gap-2.5 group shrink-0">
            <Image src="/FSM.png" alt="Escudo Fundación San Mateo" width={34} height={34} className="w-8 h-8 object-contain group-hover:scale-105 transition-transform" />
            <span className="hidden sm:inline">Panel {userRole === 'academic' ? 'Académico' : 'de Control'}</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-4xl">
             {/* CMS / Web pública */}
             {canCms && (
               <>
                 <Link href="/admin" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                   Contenido
                 </Link>
                 <Link href="/admin/pages/home" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                   Inicio
                 </Link>
                 <Link href="/admin/blog" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                   Blog
                 </Link>
                 <Link href="/admin/faqs" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                   FAQs
                 </Link>
               </>
             )}

             {/* Asistencia y reportes */}
             {canAttendanceView && (
               <>
                 <Link href="/admin/attendance" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                   Asistencia
                 </Link>
                 <Link href="/admin/attendance/alerts" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-amber-50 text-amber-900 hover:bg-amber-600 hover:text-white transition-all border border-amber-200 shrink-0">
                   📊 Planillas
                 </Link>
               </>
             )}

             {/* Matrícula y Alumnos */}
             {canStudents && (
               <>
                 <Link href="/admin/attendance/enrollment" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all text-fsm-blue shrink-0">
                   Matrícula
                 </Link>
                 <Link href="/admin/attendance/promotion" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-purple-50 text-purple-900 hover:bg-purple-700 hover:text-white transition-all border border-purple-200 shrink-0">
                   🎓 Promoción
                 </Link>
               </>
             )}

             {/* Documentos Oficiales y QR */}
             {canDocuments && (
               <Link href="/admin/documents" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-teal-50 text-teal-900 hover:bg-teal-700 hover:text-white transition-all border border-teal-200 shadow-2xs shrink-0 font-bold">
                 📜 Documentos y QR
               </Link>
             )}

             {/* Administración de Usuarios */}
             {canUsers && (
               <Link href="/admin/users" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-purple-50 text-purple-800 hover:bg-purple-600 hover:text-white transition-all border border-purple-200 shrink-0">
                 👥 Usuarios
               </Link>
             )}

             {/* SuperAdmin: Auditoría & LOGS */}
             {isSuperAdmin && (
               <Link href="/admin/logs" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-indigo-50 text-indigo-900 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-200 shadow-2xs shrink-0">
                 📜 LOGS
               </Link>
             )}
          </nav>
        </div>

        {/* Sección de usuario y sesión */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-xs font-bold text-gray-800 truncate max-w-[140px]" title={userEmail}>
              {userNameDisplay}
            </span>
            <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full border ${roleBadge.bg}`}>
              {roleBadge.text}
            </span>
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

          {canCms && (
            <Link href="/" target="_blank" className="hidden xl:inline-block text-gray-600 hover:text-fsm-blue text-[10px] font-bold uppercase tracking-wider">
              Sitio Web
            </Link>
          )}

          <form action={async () => { "use server"; await logout(); redirect("/auth/login"); }}>
            <button 
              type="submit" 
              className="px-3 py-1.5 bg-red-50 text-fsm-red hover:bg-fsm-red hover:text-white border border-red-200 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all shadow-2xs"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
