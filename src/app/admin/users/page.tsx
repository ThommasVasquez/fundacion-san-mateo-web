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
      currentUserId = '';
    }
  }

  if (!currentUserId) {
    redirect('/auth/login');
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
