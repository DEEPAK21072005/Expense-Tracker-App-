import { NextRequest, NextResponse } from 'next/server';

const authPages = new Set(['/login', '/create-account']);
const publicPaths = new Set(['/login', '/create-account', '/forgot-password', '/reset-password']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) return NextResponse.next();

  const hasSession = request.cookies.has('expense_tracker_session');

  if (hasSession && authPages.has(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (publicPaths.has(pathname)) return NextResponse.next();

  if (!hasSession) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-.*\\.png|apple-touch-icon.*\\.png).*)'] };
