import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('session')?.value;

  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    try {
      const parsed = await decrypt(session);
      if (!parsed || !parsed.adminId) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }

      const isAcademic = parsed.role === 'academic' || parsed.email === 'sacademica@fundacionsanmateosoacha.edu.co';
      
      if (isAcademic) {
        const allowedPaths = ['/admin/attendance', '/admin/attendance/enrollment', '/admin/documents'];
        const isAllowed = allowedPaths.some(path => pathname === path || pathname.startsWith(path + '/'));
        
        if (!isAllowed) {
          return NextResponse.redirect(new URL('/admin/attendance', request.url));
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
