import { sql } from '@/lib/db';
import { headers, cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export type AuditActionCategory = 'AUTH' | 'ATTENDANCE' | 'STUDENTS' | 'USERS' | 'SYSTEM' | 'CONTENT';

export interface AuditLogPayload {
  action: string;
  category: AuditActionCategory;
  details: string;
  metadata?: Record<string, any>;
  userEmail?: string;
  userRole?: string;
  userName?: string;
  ipAddress?: string;
}

/**
 * Extracts client IP and request metadata from headers safely.
 */
export async function getClientRequestInfo() {
  try {
    const reqHeaders = await headers();
    
    // Cloudflare & proxy IP extraction
    const cfIp = reqHeaders.get('cf-connecting-ip');
    const xRealIp = reqHeaders.get('x-real-ip');
    const xForwardedFor = reqHeaders.get('x-forwarded-for');
    
    let ip = cfIp || xRealIp || (xForwardedFor ? xForwardedFor.split(',')[0].trim() : '') || '127.0.0.1';
    // Clean localhost IPv6 notation
    if (ip === '::1') ip = '127.0.0.1';

    const city = reqHeaders.get('cf-ipcity') || undefined;
    const country = reqHeaders.get('cf-ipcountry') || undefined;
    const userAgent = reqHeaders.get('user-agent') || 'Desconocido';

    return { ip, city, country, userAgent };
  } catch {
    return { ip: '127.0.0.1', city: undefined, country: undefined, userAgent: 'Desconocido' };
  }
}

/**
 * Logs an event into the audit_logs table.
 * Executes safely without throwing errors to prevent disrupting the main user action.
 */
export async function logAuditEvent(payload: AuditLogPayload) {
  try {
    const { ip, city, country, userAgent } = await getClientRequestInfo();

    let email = payload.userEmail || '';
    let role = payload.userRole || '';
    let name = payload.userName || '';

    // If user info was not supplied, attempt to resolve from session cookie
    if (!email) {
      try {
        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;
        if (session) {
          const sessionPayload = await decrypt(session);
          if (sessionPayload) {
            email = sessionPayload.email || '';
            role = sessionPayload.role || '';
            name = sessionPayload.nombre || sessionPayload.email || '';
          }
        }
      } catch {
        // Ignore session extraction failure
      }
    }

    if (!email) {
      email = 'ANONIMO / SISTEMA';
    }

    const finalIp = payload.ipAddress || ip;
    const metaJson = payload.metadata ? JSON.stringify(payload.metadata) : null;

    await sql`
      INSERT INTO audit_logs (
        user_email,
        user_role,
        user_name,
        action,
        category,
        details,
        metadata,
        ip_address,
        city,
        country,
        user_agent,
        created_at
      ) VALUES (
        ${email},
        ${role || null},
        ${name || null},
        ${payload.action},
        ${payload.category},
        ${payload.details},
        ${metaJson}::jsonb,
        ${finalIp},
        ${city || null},
        ${country || null},
        ${userAgent},
        CURRENT_TIMESTAMP
      )
    `;
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
