import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { fromMinorUnits } from '@/lib/money';
import { AccountInputSchema } from '@/lib/validation';

function unauthorized() { return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 }); }
function serialize(account: { balanceMinor: number; currency: string }) { return { ...account, balance: fromMinorUnits(account.balanceMinor, account.currency) }; }

export async function GET() {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    let accounts = await prisma.account.findMany({ where: { userId: user.id }, orderBy: [{ isArchived: 'asc' }, { createdAt: 'asc' }], include: { _count: { select: { transactions: true } } } });
    if (accounts.length === 0) {
      await prisma.account.create({
        data: {
          userId: user.id,
          name: 'Primary Account',
          type: 'BANK',
          currency: user.baseCurrency,
          balanceMinor: 0,
        },
      });
      accounts = await prisma.account.findMany({ where: { userId: user.id }, orderBy: [{ isArchived: 'asc' }, { createdAt: 'asc' }], include: { _count: { select: { transactions: true } } } });
    }
    return NextResponse.json({ success: true, data: accounts.map(serialize) });
  } catch (error) { console.error('Accounts query failed', error); return NextResponse.json({ success: false, error: 'Unable to load accounts' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const parsed = AccountInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid account' }, { status: 400 });
    const input = parsed.data as typeof parsed.data & { balanceMinor: number };
    if (input.currency !== user.baseCurrency) return NextResponse.json({ success: false, error: `Accounts use your base currency (${user.baseCurrency})` }, { status: 422 });
    const account = await prisma.account.create({ data: { userId: user.id, name: input.name, type: input.type, currency: input.currency, balanceMinor: input.balanceMinor } });
    return NextResponse.json({ success: true, data: serialize(account) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return NextResponse.json({ success: false, error: 'An account with this name already exists' }, { status: 409 });
    console.error('Account creation failed', error); return NextResponse.json({ success: false, error: 'Unable to create this account' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const { id, isArchived } = await request.json();
    if (typeof id !== 'string' || typeof isArchived !== 'boolean') return NextResponse.json({ success: false, error: 'Invalid account update' }, { status: 400 });
    const account = await prisma.account.updateMany({ where: { id, userId: user.id }, data: { isArchived } });
    if (!account.count) return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { console.error('Account update failed', error); return NextResponse.json({ success: false, error: 'Unable to update this account' }, { status: 500 }); }
}
