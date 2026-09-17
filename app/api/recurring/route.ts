import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { fromMinorUnits } from '@/lib/money';
import { RecurringPaymentInputSchema } from '@/lib/validation';

function unauthorized() { return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 }); }
function serialize(item: { amountMinor: number; currency: string }) { return { ...item, amount: fromMinorUnits(item.amountMinor, item.currency) }; }

export async function GET() {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const recurring = await prisma.recurringPayment.findMany({ where: { userId: user.id }, include: { account: true, category: true }, orderBy: { nextDate: 'asc' } });
    return NextResponse.json({ success: true, data: recurring.map(serialize) });
  } catch (error) { console.error('Recurring query failed', error); return NextResponse.json({ success: false, error: 'Unable to load recurring payments' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const parsed = RecurringPaymentInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid recurring payment' }, { status: 400 });
    const input = parsed.data as typeof parsed.data & { amountMinor: number };
    if (input.currency !== user.baseCurrency) return NextResponse.json({ success: false, error: `Recurring payments use your base currency (${user.baseCurrency})` }, { status: 422 });
    const [account, category] = await Promise.all([prisma.account.findFirst({ where: { id: input.accountId, userId: user.id, isArchived: false } }), input.categoryId ? prisma.category.findFirst({ where: { id: input.categoryId, userId: user.id, type: 'EXPENSE' } }) : null]);
    if (!account || account.currency !== input.currency) return NextResponse.json({ success: false, error: 'Choose an active account in your base currency' }, { status: 422 });
    if (input.categoryId && !category) return NextResponse.json({ success: false, error: 'The selected category is unavailable' }, { status: 422 });
    const recurring = await prisma.recurringPayment.create({ data: { userId: user.id, accountId: input.accountId, categoryId: input.categoryId, description: input.description, amountMinor: input.amountMinor, currency: input.currency, frequency: input.frequency, nextDate: input.nextDate }, include: { account: true, category: true } });
    return NextResponse.json({ success: true, data: serialize(recurring) }, { status: 201 });
  } catch (error) { console.error('Recurring creation failed', error); return NextResponse.json({ success: false, error: 'Unable to create this recurring payment' }, { status: 500 }); }
}
