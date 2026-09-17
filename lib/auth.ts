import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import prisma from './db';

export const SESSION_COOKIE = 'expense_tracker_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

export async function createSession(userId: string, response: NextResponse) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}

export async function deleteCurrentSession(response: NextResponse) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(new Date(0)), maxAge: 0 });
}

export function publicUser(user: { id: string; name: string; email: string; baseCurrency: string; timezone: string; theme: string }) {
  return { id: user.id, name: user.name, email: user.email, baseCurrency: user.baseCurrency, timezone: user.timezone, theme: user.theme };
}
