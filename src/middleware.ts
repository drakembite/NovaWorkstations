import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, ADMIN_COOKIE_NAME } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAuthenticated = sessionCookie ? await verifySessionToken(sessionCookie) : false;

  // 1. Exclude /api/admin/auth/* from authentication checks
  if (pathname.startsWith('/api/admin/auth/')) {
    return NextResponse.next();
  }

  // 2. Protect all other /api/admin/* endpoints
  if (pathname.startsWith('/api/admin')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere sesión de administrador.' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 3. Admin login page (/admin/login)
  if (pathname === '/admin/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // 4. Protect all other /admin routes (/admin, /admin/productos, etc.)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};
