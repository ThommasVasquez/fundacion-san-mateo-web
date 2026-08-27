import React from 'react';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { getAdminUsersAction } from '@/app/actions';
import UserManagerClient, { AdminUserItem } from './UserManagerClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const sessionToken = (await cookies()).get('session')?.value;
  let currentUserId = '';

  if (sessionToken) {
    try {
      const payload = await decrypt(sessionToken);
      currentUserId = payload?.adminId || '';
    } catch {
      redirect('/auth/login');
    }
  } else {
    redirect('/auth/login');
  }

  const rawUsers = await getAdminUsersAction();

  const users: AdminUserItem[] = rawUsers.map((u: any) => ({
    id: u.id,
    nombre: u.nombre || u.email,
    email: u.email,
    role: u.role || 'admin',
    activo: u.activo !== false,
    permissions: Array.isArray(u.permissions) 
      ? u.permissions 
      : (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : ['attendance_view', 'attendance_edit', 'students_manage']),
    created_at: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString()
  }));

  return (
    <div className="max-w-7xl mx-auto">
      <UserManagerClient users={users} currentUserId={currentUserId} />
    </div>
  );
}
