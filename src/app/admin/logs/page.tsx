import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/auth';
import { getAuditLogsAction } from '@/app/actions';
import AuditLogsClient from './AuditLogsClient';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const session = (await cookies()).get('session')?.value;
  if (!session) {
    redirect('/auth/login');
  }

  const payload = await decrypt(session);
  const email = (payload?.email || '').toLowerCase().trim();

  // Strict superadmin check
  const isSuperAdmin = email === 'admin@fundacionsanmateo.edu.co' || email === 'admin@fundacionsanmateosoacha.edu.co';

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-red-200 text-center shadow-lg space-y-4">
        <div className="w-16 h-16 bg-red-100 text-fsm-red rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase">Acceso Denegado</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          El módulo de <strong>Registro de Auditoría & LOGS</strong> contiene información confidencial y de seguridad del sistema. Solo está habilitado para el usuario <strong>admin@fundacionsanmateo.edu.co</strong>.
        </p>
        <div className="pt-2">
          <a
            href="/admin/attendance"
            className="px-6 py-2.5 bg-fsm-blue text-white rounded-xl text-xs font-bold uppercase inline-block hover:bg-fsm-red transition-all"
          >
            Volver a Asistencia
          </a>
        </div>
      </div>
    );
  }

  const initialData = await getAuditLogsAction({ page: 1, limit: 50 });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <AuditLogsClient
        initialLogs={initialData.logs || []}
        initialTotal={initialData.total || 0}
        initialUsers={initialData.users || []}
        initialStats={initialData.stats || { logins_today: 0, attendance_changes_today: 0, unique_ips: 0, unique_users: 0 }}
      />
    </div>
  );
}
