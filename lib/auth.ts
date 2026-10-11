import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import prisma from './db';

export const SESSION_COOKIE = 'expense_tracker_session';
export const VAULT_COOKIE = 'expense_tracker_vault';
export const LEDGER_COOKIE = 'expense_tracker_ledger';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const VAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 365 days

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

export function deterministicCuid(namespace: string, key: string): string {
  const hash = crypto.createHash('sha256').update(`${namespace}:${key}`).digest('hex').slice(0, 24);
  return `c${hash}`;
}

export function getDefaultAccountData(userId: string, currency: string = 'INR') {
  return {
    id: deterministicCuid(userId, 'account:Primary Account'),
    name: 'Primary Account',
    type: 'BANK',
    currency,
    balanceMinor: 0,
  };
}

export function getDefaultCategoriesData(userId: string) {
  return DEFAULT_CATEGORIES.map((c) => ({
    id: deterministicCuid(userId, `category:${c.type}:${c.name}`),
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
  }));
}

export interface SessionUser {
  id: string;
  email?: string;
  name?: string;
  baseCurrency?: string;
  passwordHash?: string;
}

const globalForLedger = globalThis as unknown as {
  ledgerVersionByUser?: Map<string, number>;
};
const ledgerVersionByUser =
  globalForLedger.ledgerVersionByUser ?? (globalForLedger.ledgerVersionByUser = new Map<string, number>());

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

function verifySignedPayload<T>(token: string): T | null {
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
    const jsonStr = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

interface LedgerSnapshot {
  u: string;
  ts: number;
  a: Array<{ id: string; n: string; t: string; cur: string; b: number; ar: boolean }>;
  c: Array<{ id: string; n: string; t: string; ic: string; col: string }>;
  tx: Array<{
    id: string;
    aId: string;
    toId: string | null;
    cId: string | null;
    am: number;
    cur: string;
    t: string;
    d: string;
    p: string | null;
    no: string | null;
    tg: string | null;
    rec: boolean;
  }>;
  b: Array<{ id: string; cId: string | null; am: number; p: string; m: number | null; y: number | null; th: number }>;
  r: Array<{
    id: string;
    aId: string;
    cId: string | null;
    desc: string;
    am: number;
    cur: string;
    f: string;
    nd: string;
    act: boolean;
  }>;
  s: Array<{
    id: string;
    n: string;
    desc: string | null;
    m: Array<{ id: string; n: string }>;
    e: Array<{
      id: string;
      pId: string;
      desc: string;
      am: number;
      cur: string;
      d: string;
      st: string;
      sh: Array<{ id: string; mId: string; sm: number }>;
    }>;
  }>;
}

export async function attachLedgerSyncCookie(userId: string, response: NextResponse) {
  try {
    const defaultCatIds = new Set(getDefaultCategoriesData(userId).map((c) => c.id));
    const [accounts, categories, transactions, budgets, recurring, splits] = await Promise.all([
      prisma.account.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.category.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.transaction.findMany({ where: { userId }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 40 }),
      prisma.budget.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, take: 30 }),
      prisma.recurringPayment.findMany({ where: { userId }, orderBy: { nextDate: 'asc' }, take: 30 }),
      prisma.expenseSplitGroup.findMany({
        where: { userId },
        include: { members: true, expenses: { include: { shares: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    const ts = Date.now();
    ledgerVersionByUser.set(userId, ts);

    const customCategories = categories.filter((c) => !defaultCatIds.has(c.id));

    let txLimit = transactions.length;
    let token = '';

    while (txLimit >= 0) {
      const snapshot: LedgerSnapshot = {
        u: userId,
        ts,
        a: accounts.map((a) => ({
          id: a.id,
          n: a.name,
          t: a.type,
          cur: a.currency,
          b: a.balanceMinor,
          ar: a.isArchived,
        })),
        c: customCategories.map((c) => ({
          id: c.id,
          n: c.name,
          t: c.type,
          ic: c.icon,
          col: c.color,
        })),
        tx: transactions.slice(0, txLimit).map((t) => ({
          id: t.id,
          aId: t.accountId,
          toId: t.toAccountId,
          cId: t.categoryId,
          am: t.amountMinor,
          cur: t.currency,
          t: t.type,
          d: t.date.toISOString(),
          p: t.payee,
          no: t.notes,
          tg: t.tags,
          rec: t.isRecurring,
        })),
        b: budgets.map((b) => ({
          id: b.id,
          cId: b.categoryId,
          am: b.amountMinor,
          p: b.period,
          m: b.month,
          y: b.year,
          th: b.alertThreshold,
        })),
        r: recurring.map((r) => ({
          id: r.id,
          aId: r.accountId,
          cId: r.categoryId,
          desc: r.description,
          am: r.amountMinor,
          cur: r.currency,
          f: r.frequency,
          nd: r.nextDate.toISOString(),
          act: r.isActive,
        })),
        s: splits.map((s) => ({
          id: s.id,
          n: s.name,
          desc: s.description,
          m: s.members.map((m) => ({ id: m.id, n: m.name })),
          e: s.expenses.map((e) => ({
            id: e.id,
            pId: e.paidById,
            desc: e.description,
            am: e.amountMinor,
            cur: e.currency,
            d: e.date.toISOString(),
            st: e.splitType,
            sh: e.shares.map((sh) => ({ id: sh.id, mId: sh.memberId, sm: sh.shareMinor })),
          })),
        })),
      };

      const compressed = zlib.deflateRawSync(Buffer.from(JSON.stringify(snapshot), 'utf8')).toString('base64url');
      token = `${compressed}.${makeHmac(compressed)}`;
      if (token.length <= 3700 || txLimit === 0) break;
      txLimit = Math.max(0, txLimit - 8);
    }

    const expiresAt = new Date(Date.now() + VAULT_MAX_AGE_SECONDS * 1000);
    response.cookies.set(LEDGER_COOKIE, token, sessionCookieOptions(expiresAt));
  } catch (error) {
    console.error('Failed to attach ledger sync cookie:', error);
  }
}

async function hydrateLedgerFromCookie(userId: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(LEDGER_COOKIE)?.value;
    if (!token) return;

    const lastDot = token.lastIndexOf('.');
    if (lastDot === -1) return;
    const payload = token.substring(0, lastDot);
    const sig = token.substring(lastDot + 1);
    const expectedSig = makeHmac(payload);

    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return;

    const jsonStr = zlib.inflateRawSync(Buffer.from(payload, 'base64url')).toString('utf8');
    const snapshot = JSON.parse(jsonStr) as LedgerSnapshot;
    if (!snapshot || snapshot.u !== userId || typeof snapshot.ts !== 'number') return;

    const localTs = ledgerVersionByUser.get(userId) ?? 0;
    if (localTs >= snapshot.ts) return;

    const defaultCats = getDefaultCategoriesData(userId);
    const allCats = [
      ...defaultCats,
      ...(snapshot.c ?? []).map((c) => ({
        id: c.id,
        name: c.n,
        type: c.t,
        icon: c.ic,
        color: c.col,
      })),
    ];

    for (const c of allCats) {
      const existing = await prisma.category.findFirst({
        where: { OR: [{ id: c.id }, { userId, name: c.name, type: c.type }] },
      });
      if (!existing) {
        await prisma.category.create({
          data: { id: c.id, userId, name: c.name, type: c.type, icon: c.icon, color: c.color },
        });
      }
    }

    for (const a of snapshot.a ?? []) {
      const existing = await prisma.account.findFirst({
        where: { OR: [{ id: a.id }, { userId, name: a.n }] },
      });
      if (existing) {
        await prisma.account.update({
          where: { id: existing.id },
          data: { balanceMinor: a.b, isArchived: a.ar, currency: a.cur, type: a.t },
        });
      } else {
        await prisma.account.create({
          data: { id: a.id, userId, name: a.n, type: a.t, currency: a.cur, balanceMinor: a.b, isArchived: a.ar },
        });
      }
    }

    if (Array.isArray(snapshot.tx)) {
      const snapshotTxIds = snapshot.tx.map((t) => t.id);
      await prisma.transaction.deleteMany({
        where: { userId, id: { notIn: snapshotTxIds } },
      });
      for (const t of snapshot.tx) {
        const exists = await prisma.transaction.findUnique({ where: { id: t.id } });
        if (exists) {
          await prisma.transaction.update({
            where: { id: t.id },
            data: {
              accountId: t.aId,
              toAccountId: t.toId,
              categoryId: t.cId,
              amountMinor: t.am,
              currency: t.cur,
              type: t.t,
              date: new Date(t.d),
              payee: t.p,
              notes: t.no,
              tags: t.tg,
              isRecurring: t.rec,
            },
          });
        } else {
          await prisma.transaction.create({
            data: {
              id: t.id,
              userId,
              accountId: t.aId,
              toAccountId: t.toId,
              categoryId: t.cId,
              amountMinor: t.am,
              currency: t.cur,
              type: t.t,
              date: new Date(t.d),
              payee: t.p,
              notes: t.no,
              tags: t.tg,
              isRecurring: t.rec,
            },
          });
        }
      }
    }

    if (Array.isArray(snapshot.b)) {
      const snapshotBudgetIds = snapshot.b.map((b) => b.id);
      await prisma.budget.deleteMany({
        where: { userId, id: { notIn: snapshotBudgetIds } },
      });
      for (const b of snapshot.b) {
        const existing = await prisma.budget.findFirst({
          where: { OR: [{ id: b.id }, { userId, categoryId: b.cId, month: b.m, year: b.y }] },
        });
        if (existing) {
          await prisma.budget.update({
            where: { id: existing.id },
            data: { amountMinor: b.am, alertThreshold: b.th },
          });
        } else {
          await prisma.budget.create({
            data: {
              id: b.id,
              userId,
              categoryId: b.cId,
              amountMinor: b.am,
              period: b.p,
              month: b.m,
              year: b.y,
              alertThreshold: b.th,
            },
          });
        }
      }
    }

    if (Array.isArray(snapshot.r)) {
      const snapshotRecIds = snapshot.r.map((r) => r.id);
      await prisma.recurringPayment.deleteMany({
        where: { userId, id: { notIn: snapshotRecIds } },
      });
      for (const r of snapshot.r) {
        const existing = await prisma.recurringPayment.findUnique({ where: { id: r.id } });
        if (!existing) {
          await prisma.recurringPayment.create({
            data: {
              id: r.id,
              userId,
              accountId: r.aId,
              categoryId: r.cId,
              description: r.desc,
              amountMinor: r.am,
              currency: r.cur,
              frequency: r.f,
              nextDate: new Date(r.nd),
              isActive: r.act,
            },
          });
        }
      }
    }

    if (Array.isArray(snapshot.s)) {
      for (const s of snapshot.s) {
        let group = await prisma.expenseSplitGroup.findFirst({
          where: { OR: [{ id: s.id }, { userId, name: s.n }] },
        });
        if (!group) {
          group = await prisma.expenseSplitGroup.create({
            data: { id: s.id, userId, name: s.n, description: s.desc },
          });
        }
        for (const m of s.m ?? []) {
          const member = await prisma.splitMember.findFirst({
            where: { OR: [{ id: m.id }, { groupId: group.id, name: m.n }] },
          });
          if (!member) {
            await prisma.splitMember.create({
              data: { id: m.id, groupId: group.id, name: m.n },
            });
          }
        }
        for (const e of s.e ?? []) {
          const exp = await prisma.splitExpense.findUnique({ where: { id: e.id } });
          if (!exp) {
            await prisma.splitExpense.create({
              data: {
                id: e.id,
                groupId: group.id,
                paidById: e.pId,
                description: e.desc,
                amountMinor: e.am,
                currency: e.cur,
                date: new Date(e.d),
                splitType: e.st,
                shares: {
                  create: (e.sh ?? []).map((sh) => ({
                    id: sh.id,
                    memberId: sh.mId,
                    shareMinor: sh.sm,
                  })),
                },
              },
            });
          }
        }
      }
    }

    ledgerVersionByUser.set(userId, snapshot.ts);
  } catch (error) {
    console.error('Ledger cookie hydration warning:', error);
  }
}

function createToken(user: SessionUser, expiresAt: Date): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email || '',
      name: user.name || '',
      baseCurrency: user.baseCurrency || 'INR',
      ph: user.passwordHash || '',
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
  passwordHash?: string;
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
        passwordHash: data.ph || undefined,
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

export function createPasswordResetToken(user: SessionUser, expiresAt: Date): string {
  const payload = Buffer.from(
    JSON.stringify({
      purpose: 'pwd_reset',
      userId: user.id,
      email: user.email || '',
      name: user.name || '',
      baseCurrency: user.baseCurrency || 'INR',
      exp: expiresAt.getTime(),
      nonce: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  return `${payload}.${makeHmac(payload)}`;
}

export function verifyPasswordResetToken(token: string): {
  userId: string;
  email: string;
  name: string;
  baseCurrency: string;
  expiresAt: Date;
} | null {
  const data = verifySignedPayload<{
    purpose?: string;
    userId?: string;
    email?: string;
    name?: string;
    baseCurrency?: string;
    exp?: number;
  }>(token);
  if (!data || data.purpose !== 'pwd_reset' || !data.userId || !data.email || !data.exp) {
    return null;
  }
  if (data.exp < Date.now()) return null;
  return {
    userId: data.userId,
    email: data.email,
    name: data.name || 'User',
    baseCurrency: data.baseCurrency || 'INR',
    expiresAt: new Date(data.exp),
  };
}

export function sessionCookieOptions(expiresAt: Date) {
  const isProd = process.env.NODE_ENV === 'production';
  const isHttps = Boolean(
    (process.env.VERCEL && process.env.VERCEL_ENV === 'production') ||
    process.env.RENDER ||
    (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.startsWith('https'))
  );
  return {
    httpOnly: true,
    secure: isProd && isHttps,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

export async function createSession(
  userOrId: string | SessionUser,
  response: NextResponse,
  rememberMe: boolean = true
) {
  const maxAgeSeconds = rememberMe ? SESSION_MAX_AGE_SECONDS : 60 * 60 * 24; // 30 days vs 1 day
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  let user: SessionUser;
  if (typeof userOrId === 'string') {
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: userOrId } });
      if (dbUser) {
        user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          baseCurrency: dbUser.baseCurrency,
          passwordHash: dbUser.passwordHash,
        };
      } else {
        user = { id: userOrId };
      }
    } catch {
      user = { id: userOrId };
    }
  } else {
    user = userOrId;
  }
  const token = createToken(user, expiresAt);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));

  // Also persist an HMAC-signed account vault cookie so serverless cold starts after sign-out still recognize the user
  if (user.email && user.name) {
    const vaultExpiresAt = new Date(Date.now() + VAULT_MAX_AGE_SECONDS * 1000);
    const vaultToken = createToken(user, vaultExpiresAt);
    response.cookies.set(VAULT_COOKIE, vaultToken, sessionCookieOptions(vaultExpiresAt));
  }
}

export async function syncVaultUserToDb() {
  try {
    const cookieStore = await cookies();
    const vaultToken = cookieStore.get(VAULT_COOKIE)?.value || cookieStore.get(SESSION_COOKIE)?.value;
    if (!vaultToken) return null;

    const parsed = parseToken(vaultToken);
    if (!parsed || !parsed.email || !parsed.name) return null;

    let user = await prisma.user.findUnique({ where: { id: parsed.userId } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: parsed.email.toLowerCase() } });
    }

    if (!user) {
      const currency = parsed.baseCurrency || 'INR';
      try {
        user = await prisma.user.create({
          data: {
            id: parsed.userId,
            email: parsed.email.toLowerCase(),
            name: parsed.name,
            baseCurrency: currency,
            passwordHash: parsed.passwordHash || '',
            categories: {
              create: getDefaultCategoriesData(parsed.userId),
            },
            accounts: {
              create: [getDefaultAccountData(parsed.userId, currency)],
            },
          },
        });
      } catch {
        user = await prisma.user.findUnique({ where: { email: parsed.email.toLowerCase() } });
      }
    } else if (!user.passwordHash && parsed.passwordHash) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: parsed.passwordHash },
      });
    }
    if (user) {
      await hydrateLedgerFromCookie(user.id);
    }
    return user;
  } catch {
    return null;
  }
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
    // re-create the user along with deterministic initial categories and primary account.
    if (!user && parsed.email && parsed.name) {
      const currency = parsed.baseCurrency || 'INR';
      try {
        user = await prisma.user.create({
          data: {
            id: parsed.userId,
            email: parsed.email,
            name: parsed.name,
            baseCurrency: currency,
            passwordHash: parsed.passwordHash || '',
            categories: {
              create: getDefaultCategoriesData(parsed.userId),
            },
            accounts: {
              create: [getDefaultAccountData(parsed.userId, currency)],
            },
          },
        });
      } catch {
        // In case of concurrent creation, fetch again
        user = await prisma.user.findUnique({ where: { id: parsed.userId } });
      }
    } else if (user) {
      const updates: { passwordHash?: string; baseCurrency?: string; name?: string } = {};
      if (!user.passwordHash && parsed.passwordHash) updates.passwordHash = parsed.passwordHash;
      if (parsed.baseCurrency && user.baseCurrency !== parsed.baseCurrency) updates.baseCurrency = parsed.baseCurrency;
      if (parsed.name && user.name !== parsed.name) updates.name = parsed.name;
      if (Object.keys(updates).length > 0) {
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updates,
          });
        } catch {
          // ignore concurrent update
        }
      }
    }

    if (user) {
      await hydrateLedgerFromCookie(user.id);
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

