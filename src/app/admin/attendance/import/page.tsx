import React from 'react';
import ImportClient from './ImportClient';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { userHasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Subir alumnos en bloque',
};

export default async function ImportPage() {
  const sessionToken = (await cookies()).get('session')?.value;
  let payload: any = null;
  if (sessionToken) {
    try {
      payload = await decrypt(sessionToken);
    } catch {
      payload = null;
    }
  }

  if (!payload || (!payload.adminId && !payload.teacherId)) {
    redirect('/auth/login');
  }

  const userEmail = (payload.email || '').toLowerCase().trim();
  const hasAccess = userHasPermission('students_manage', payload.role, payload.permissions, userEmail);
  if (!hasAccess) {
    redirect('/admin/attendance');
  }

  return <ImportClient />;
}
