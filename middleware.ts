import { NextRequest, NextResponse } from 'next/server';

const authPages = new Set(['/login', '/create-account']);
const publicPaths = new Set(['/login', '/create-account', '/forgot-password', '/reset-password']);

function isSessionValid(token: string | undefined): boolean {
  if (!token) return false;
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;
  const payload = token.substring(0, lastDot);
  try {
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const data = JSON.parse(jsonStr);
    if (!data || !data.userId || !data.exp) return false;
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) return NextResponse.next();

  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|webmanifest|json)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('expense_tracker_session')?.value;
  const hasValidSession = isSessionValid(sessionCookie);

  // If user has a valid active session and visits /login or /create-account
  if (hasValidSession && authPages.has(pathname)) {
    const isSwitching = request.nextUrl.searchParams.get('switch') === 'true';
    if (!isSwitching) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Public paths (/login, /create-account, /forgot-password, /reset-password)
  if (publicPaths.has(pathname)) {
    return NextResponse.next();
  }

  // Protected paths require a valid session
  if (!hasValidSession) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') {
      url.searchParams.set('next', pathname);
    }
    const response = NextResponse.redirect(url);
    // Clear stale or corrupt cookie if present
    if (sessionCookie) {
      response.cookies.set('expense_tracker_session', '', { maxAge: 0, path: '/' });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|webmanifest|json)$).*)',
  ],
};
