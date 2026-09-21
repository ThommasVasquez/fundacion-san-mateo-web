import '@/lib/polyfill';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';
import { checkRoutePermission } from '@/lib/permissions';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('session')?.value;

  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    try {
      const parsed = await decrypt(session);
      if (!parsed || (!parsed.adminId && !parsed.teacherId)) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }

      const role = parsed.role;
      const permissions = parsed.permissions;
      const email = parsed.email;

      const check = checkRoutePermission(pathname, role, permissions, email);
      if (!check.allowed) {
        const target = check.redirectUrl || '/admin/attendance';
        if (target !== pathname) {
          return NextResponse.redirect(new URL(target, request.url));
        }
      }
    } catch {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
