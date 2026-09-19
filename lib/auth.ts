import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import prisma from './db';

export const SESSION_COOKIE = 'expense_tracker_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', type: 'EXPENSE', icon: 'utensils', color: '#f97316' },
  { name: 'Groceries', type: 'EXPENSE', icon: 'shopping-cart', color: '#10b981' },
  { name: 'Housing & Rent', type: 'EXPENSE', icon: 'home', color: '#3b82f6' },
  { name: 'Transportation', type: 'EXPENSE', icon: 'car', color: '#6366f1' },
  { name: 'Utilities & Bills', type: 'EXPENSE', icon: 'zap', color: '#eab308' },
  { name: 'Healthcare', type: 'EXPENSE', icon: 'activity', color: '#ec4899' },
  { name: 'Entertainment', type: 'EXPENSE', icon: 'film', color: '#8b5cf6' },
  { name: 'Shopping', type: 'EXPENSE', icon: 'tag', color: '#14b8a6' },
  { name: 'Salary', type: 'INCOME', icon: 'briefcase', color: '#059669' },
  { name: 'Investments', type: 'INCOME', icon: 'trending-up', color: '#2563eb' },
  { name: 'Other Income', type: 'INCOME', icon: 'dollar-sign', color: '#10b981' },
];

export interface SessionUser {
  id: string;
  email?: string;
  name?: string;
  baseCurrency?: string;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Auth] SESSION_SECRET is not set — using fallback. Set it in Vercel / environment variables!');
    }
    return 'expense-tracker-dev-secret-change-in-production-please';
  }
  return secret;
}

function makeHmac(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function createToken(user: SessionUser, expiresAt: Date): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email || '',
      name: user.name || '',
      baseCurrency: user.baseCurrency || 'INR',
      exp: expiresAt.getTime(),
    })
  ).toString('base64url');
  return `${payload}.${makeHmac(payload)}`;
}

function parseToken(token: string): {
  userId: string;
  email?: string;
  name?: string;
  baseCurrency?: string;
  expiresAt: Date;
} | null {
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = token.substring(0, lastDot);
  const sig = token.substring(lastDot + 1);
  const expectedSig = makeHmac(payload);

  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  try {
    const jsonStr = Buffer.from(payload, 'base64url').toString('utf8');
    const data = JSON.parse(jsonStr);
    if (data && data.userId && data.exp) {
      return {
        userId: data.userId,
        email: data.email || undefined,
        name: data.name || undefined,
        baseCurrency: data.baseCurrency || 'INR',
        expiresAt: new Date(data.exp),
      };
    }
  } catch {
    // Fall back to legacy dot format
  }

  const parts = payload.split('.');
  if (parts.length === 2) {
    const [userId, expiresAtMsStr] = parts;
    const expiresAtMs = parseInt(expiresAtMsStr, 10);
    if (!userId || isNaN(expiresAtMs)) return null;
    return { userId, expiresAt: new Date(expiresAtMs) };
  }
  return null;
}

export function sessionCookieOptions(expiresAt: Date) {
  const isVercelHttps = Boolean(process.env.VERCEL && process.env.VERCEL_ENV === 'production');
  return {
    httpOnly: true,
    secure: isVercelHttps,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

export async function createSession(
  userOrId: string | SessionUser,
  response: NextResponse
) {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const user: SessionUser =
    typeof userOrId === 'string' ? { id: userOrId } : userOrId;
  const token = createToken(user, expiresAt);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const parsed = parseToken(token);
  if (!parsed || parsed.expiresAt <= new Date()) return null;

  try {
    let user = await prisma.user.findUnique({ where: { id: parsed.userId } });

    // Serverless cold-start resilience on Vercel:
    // If HMAC signature is verified but the user record does not exist in this instance's /tmp/dev.db,
    // re-create the user along with initial categories and primary account.
    if (!user && parsed.email && parsed.name) {
      try {
        user = await prisma.user.create({
          data: {
            id: parsed.userId,
            email: parsed.email,
            name: parsed.name,
            baseCurrency: parsed.baseCurrency || 'INR',
            passwordHash: '', // Stateless HMAC session
            categories: {
              create: DEFAULT_CATEGORIES,
            },
            accounts: {
              create: [
                {
                  name: 'Primary Account',
                  type: 'BANK',
                  currency: parsed.baseCurrency || 'INR',
                  balanceMinor: 0,
                },
              ],
            },
          },
        });
      } catch {
        // In case of concurrent creation, fetch again
        user = await prisma.user.findUnique({ where: { id: parsed.userId } });
      }
    }

    return user;
  } catch (error) {
    console.error('getCurrentUser lookup failed:', error);
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
