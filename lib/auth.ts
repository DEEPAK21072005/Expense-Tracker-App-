import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import prisma from './db';

export const SESSION_COOKIE = 'expense_tracker_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Stateless HMAC-signed cookie sessions.
 *
 * Token format: `${userId}.${expiresAtMs}.${hmacHex}`
 *
 * Why stateless?
 * - SQLite on Vercel serverless runs in /tmp, which is NOT shared between
 *   Lambda instances. Database-backed sessions created in one instance are
 *   invisible to all others → every API call returns 401.
 * - HMAC-signed cookies require zero DB reads for auth and work on any
 *   serverless / edge platform.
 */

function getSecret(): string {
  // In production, SESSION_SECRET must be set. In dev, a default is used.
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Auth] SESSION_SECRET is not set — using insecure fallback. Set it in your environment variables!');
    }
    return 'expense-tracker-dev-secret-change-in-production-please';
  }
  return secret;
}

function makeHmac(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function createToken(userId: string, expiresAt: Date): string {
  const payload = `${userId}.${expiresAt.getTime()}`;
  return `${payload}.${makeHmac(payload)}`;
}

function parseToken(token: string): { userId: string; expiresAt: Date } | null {
  // Split off the last segment as the signature
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = token.substring(0, lastDot);
  const sig = token.substring(lastDot + 1);
  const expectedSig = makeHmac(payload);

  // Timing-safe comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  // Payload is `userId.expiresAtMs`
  const secondLastDot = payload.lastIndexOf('.');
  if (secondLastDot === -1) return null;
  const userId = payload.substring(0, secondLastDot);
  const expiresAtMs = parseInt(payload.substring(secondLastDot + 1), 10);
  if (!userId || isNaN(expiresAtMs)) return null;

  return { userId, expiresAt: new Date(expiresAtMs) };
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
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const token = createToken(userId, expiresAt);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const parsed = parseToken(token);
  if (!parsed || parsed.expiresAt <= new Date()) return null;

  // Load user from DB by ID (single lookup, no session table needed)
  try {
    const user = await prisma.user.findUnique({ where: { id: parsed.userId } });
    return user;
  } catch {
    return null;
  }
}

export async function deleteCurrentSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(new Date(0)), maxAge: 0 });
}

export function publicUser(user: {
  id: string;
  name: string;
  email: string;
  baseCurrency: string;
  timezone: string;
  theme: string;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    baseCurrency: user.baseCurrency,
    timezone: user.timezone,
    theme: user.theme,
  };
}
