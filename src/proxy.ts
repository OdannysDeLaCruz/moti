import { NextRequest, NextResponse } from 'next/server';

const ROLE_ROUTES: { prefix: string; roles: string[] }[] = [
  { prefix: '/client', roles: ['CLIENT', 'ADMIN'] },
  { prefix: '/driver', roles: ['DRIVER', 'ADMIN'] },
  { prefix: '/admin', roles: ['ADMIN'] },
];

const ROLE_HOME: Record<string, string> = {
  CLIENT: '/client/dashboard',
  DRIVER: '/driver/dashboard',
  ADMIN: '/admin/dashboard',
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionExists = request.cookies.get('session_exists')?.value;
  const role = request.cookies.get('user_role')?.value ?? '';

  const protectedRoute = ROLE_ROUTES.find((r) => pathname.startsWith(r.prefix));

  if (protectedRoute) {
    if (!sessionExists) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (role && !protectedRoute.roles.includes(role)) {
      const home = ROLE_HOME[role] ?? '/';
      return NextResponse.redirect(new URL(home, request.url));
    }
    if (
      role === 'DRIVER' &&
      pathname.startsWith('/driver') &&
      !pathname.startsWith('/driver/onboarding')
    ) {
      const driverVerified = request.cookies.get('driver_verified')?.value;
      if (!driverVerified) {
        return NextResponse.redirect(new URL('/driver/onboarding', request.url));
      }
    }
  }

  if (sessionExists && (pathname === '/login' || pathname === '/signup')) {
    const home = ROLE_HOME[role] ?? '/';
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
