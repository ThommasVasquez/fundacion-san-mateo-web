import React from 'react';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { getAdminUsersAction } from '@/app/actions';
import UserManagerClient, { AdminUserItem } from './UserManagerClient';
import { redirect } from 'next/navigation';
import { userHasPermission } from '@/lib/permissions';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const sessionToken = (await cookies()).get('session')?.value;
  let currentUserId = '';
  let payload: any = null;

  if (sessionToken) {
    try {
      payload = await decrypt(sessionToken);
      currentUserId = payload?.adminId || '';
    } catch {
      currentUserId = '';
    }
  }

  if (!currentUserId || !payload) {
    redirect('/auth/login');
  }

  // Verificación estricta de permiso
  const hasAccess = userHasPermission('users_manage', payload.role, payload.permissions, payload.email);
  if (!hasAccess) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-red-200 text-center shadow-lg space-y-4">
        <div className="w-16 h-16 bg-red-100 text-fsm-red rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Acceso Restringido</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          No tienes el permiso <strong>Administrar Usuarios y Permisos</strong> (<code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">users_manage</code>). Este módulo está reservado para Administradores de la Fundación San Mateo.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/attendance"
            className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl text-xs font-bold uppercase inline-flex items-center gap-2 hover:bg-fsm-red transition-all shadow-sm"
          >
            <ArrowLeft size={14} /> Volver a Asistencia
          </Link>
        </div>
      </div>
    );
  }

  let rawUsers: any[] = [];
  try {
    rawUsers = await getAdminUsersAction();
    if (!Array.isArray(rawUsers)) rawUsers = [];
  } catch (error) {
    console.error('Failed to fetch admin users in page:', error);
    rawUsers = [];
  }

  const users: AdminUserItem[] = rawUsers.map((u: any) => {
    let perms: string[] = ['attendance_view', 'attendance_edit', 'students_manage'];
    if (Array.isArray(u?.permissions)) {
      perms = u.permissions;
    } else if (typeof u?.permissions === 'string') {
      try {
        const parsed = JSON.parse(u.permissions);
        if (Array.isArray(parsed)) perms = parsed;
      } catch {
        perms = ['attendance_view', 'attendance_edit', 'students_manage'];
      }
    }

    let createdAtIso = new Date().toISOString();
    if (u?.created_at) {
      try {
        const d = new Date(u.created_at);
        if (!isNaN(d.getTime())) {
          createdAtIso = d.toISOString();
        }
      } catch {
        createdAtIso = new Date().toISOString();
      }
    }

    return {
      id: String(u?.id || ''),
      nombre: String(u?.nombre || u?.email || 'Usuario'),
      email: String(u?.email || ''),
      role: String(u?.role || 'admin'),
      activo: u?.activo !== false,
      permissions: perms,
      created_at: createdAtIso
    };
  });

  return (
    <div className="max-w-7xl mx-auto">
      <UserManagerClient users={users} currentUserId={currentUserId} />
    </div>
  );
}
