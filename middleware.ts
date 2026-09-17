import { NextRequest, NextResponse } from 'next/server';

const publicPaths = new Set(['/login', '/create-account']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/') || publicPaths.has(pathname)) return NextResponse.next();
  if (!request.cookies.has('expense_tracker_session')) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-.*\\.png|apple-touch-icon.*\\.png).*)'] };
