import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { fromMinorUnits, parseAmountToMinor } from '@/lib/money';
import { TransactionInputSchema } from '@/lib/validation';

const includes = { category: true, account: true, toAccount: true } satisfies Prisma.TransactionInclude;
type TransactionWithRelations = Prisma.TransactionGetPayload<{ include: typeof includes }>;

function unauthorized() { return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 }); }
function serializeTransaction(transaction: TransactionWithRelations) { return { ...transaction, amount: fromMinorUnits(transaction.amountMinor, transaction.currency) }; }
function dateOnly(value: string, isEnd = false) { return new Date(`${value}T${isEnd ? '23:59:59.999' : '00:00:00.000'}Z`); }

async function validateReferences(userId: string, input: { accountId: string; toAccountId?: string | null; categoryId?: string | null; currency: string; type: string }) {
  const source = await prisma.account.findFirst({ where: { id: input.accountId, userId, isArchived: false } });
  if (!source) return { error: 'The selected source account is unavailable' } as const;
  if (source.currency !== input.currency) return { error: 'Transaction currency must match the source account' } as const;
  let destination = null;
  if (input.type === 'TRANSFER') {
    destination = await prisma.account.findFirst({ where: { id: input.toAccountId ?? '', userId, isArchived: false } });
    if (!destination || destination.currency !== input.currency) return { error: 'Transfers require an owned destination account with the same currency' } as const;
  }
  if (input.type !== 'TRANSFER' && input.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: input.categoryId, userId, type: input.type } });
    if (!category) return { error: 'The selected category is unavailable' } as const;
  }
  return { source, destination } as const;
}

async function applyBalanceChange(client: Prisma.TransactionClient, transaction: { accountId: string; toAccountId: string | null; amountMinor: number; type: string }, direction: 1 | -1) {
  const sourceDelta = transaction.type === 'INCOME' ? transaction.amountMinor * direction : transaction.type === 'EXPENSE' || transaction.type === 'TRANSFER' ? -transaction.amountMinor * direction : 0;
  if (sourceDelta) await client.account.update({ where: { id: transaction.accountId }, data: { balanceMinor: { increment: sourceDelta } } });
  if (transaction.type === 'TRANSFER' && transaction.toAccountId) await client.account.update({ where: { id: transaction.toAccountId }, data: { balanceMinor: { increment: transaction.amountMinor * direction } } });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const params = request.nextUrl.searchParams;
    const where: Prisma.TransactionWhereInput = { userId: user.id };
    const search = params.get('search')?.trim();
    if (search) where.OR = [{ payee: { contains: search } }, { notes: { contains: search } }, { tags: { contains: search } }];
    const categoryId = params.get('categoryId'); if (categoryId) where.categoryId = categoryId;
    const accountId = params.get('accountId'); if (accountId) where.accountId = accountId;
    const type = params.get('type'); if (type && ['EXPENSE', 'INCOME', 'TRANSFER'].includes(type)) where.type = type;
    const startDate = params.get('startDate'); const endDate = params.get('endDate');
    if (startDate || endDate) where.date = { ...(startDate ? { gte: dateOnly(startDate) } : {}), ...(endDate ? { lte: dateOnly(endDate, true) } : {}) };
    const transactions = await prisma.transaction.findMany({ where, include: includes, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 200 });
    return NextResponse.json({ success: true, data: transactions.map(serializeTransaction) });
  } catch (error) {
    console.error('Transactions query failed', error);
    return NextResponse.json({ success: false, error: 'Unable to load transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const parsed = TransactionInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid transaction' }, { status: 400 });
    const input = parsed.data; const amountMinor = parseAmountToMinor(input.amount, input.currency);
    if (input.currency !== user.baseCurrency) return NextResponse.json({ success: false, error: `Transactions use your base currency (${user.baseCurrency})` }, { status: 422 });
    const references = await validateReferences(user.id, input);
    if ('error' in references) return NextResponse.json({ success: false, error: references.error }, { status: 422 });
    const transaction = await prisma.$transaction(async (client) => {
      const created = await client.transaction.create({ data: { userId: user.id, accountId: input.accountId, toAccountId: input.type === 'TRANSFER' ? input.toAccountId : null, categoryId: input.type === 'TRANSFER' ? null : input.categoryId, amountMinor, currency: input.currency, type: input.type, date: input.date, payee: input.payee || (input.type === 'TRANSFER' ? 'Account transfer' : null), notes: input.notes, tags: input.tags }, include: includes });
      await applyBalanceChange(client, created, 1); return created;
    });
    return NextResponse.json({ success: true, data: serializeTransaction(transaction) }, { status: 201 });
  } catch (error) {
    console.error('Transaction creation failed', error);
    return NextResponse.json({ success: false, error: 'Unable to save this transaction' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const body = await request.json(); const id = typeof body.id === 'string' ? body.id : '';
    const parsed = TransactionInputSchema.safeParse(body);
    if (!id || !parsed.success) return NextResponse.json({ success: false, error: parsed.success ? 'Transaction ID is required' : parsed.error.issues[0]?.message ?? 'Invalid transaction' }, { status: 400 });
    const current = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!current) return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    const input = parsed.data; const amountMinor = parseAmountToMinor(input.amount, input.currency);
    if (input.currency !== user.baseCurrency) return NextResponse.json({ success: false, error: `Transactions use your base currency (${user.baseCurrency})` }, { status: 422 });
    const references = await validateReferences(user.id, input);
    if ('error' in references) return NextResponse.json({ success: false, error: references.error }, { status: 422 });
    const updated = await prisma.$transaction(async (client) => {
      await applyBalanceChange(client, current, -1);
      const record = await client.transaction.update({ where: { id }, data: { accountId: input.accountId, toAccountId: input.type === 'TRANSFER' ? input.toAccountId : null, categoryId: input.type === 'TRANSFER' ? null : input.categoryId, amountMinor, currency: input.currency, type: input.type, date: input.date, payee: input.payee || (input.type === 'TRANSFER' ? 'Account transfer' : null), notes: input.notes, tags: input.tags }, include: includes });
      await applyBalanceChange(client, record, 1); return record;
    });
    return NextResponse.json({ success: true, data: serializeTransaction(updated) });
  } catch (error) {
    console.error('Transaction update failed', error);
    return NextResponse.json({ success: false, error: 'Unable to update this transaction' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
  try {
    const current = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!current) return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    await prisma.$transaction(async (client) => { await applyBalanceChange(client, current, -1); await client.transaction.delete({ where: { id: current.id } }); });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transaction deletion failed', error);
    return NextResponse.json({ success: false, error: 'Unable to delete this transaction' }, { status: 500 });
  }
}
