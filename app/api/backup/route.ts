import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/db';

function unauthorized() { return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 }); }
const types = new Set(['CASH', 'BANK', 'CREDIT_CARD', 'SAVINGS', 'WALLET', 'INVESTMENT']);
const transactionTypes = new Set(['EXPENSE', 'INCOME', 'TRANSFER']);
const currencyCodes = new Set(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'CAD', 'AUD']);

export async function GET() {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const [accounts, categories, transactions, budgets, recurringPayments] = await Promise.all([
      prisma.account.findMany({ where: { userId: user.id } }), prisma.category.findMany({ where: { userId: user.id } }), prisma.transaction.findMany({ where: { userId: user.id } }), prisma.budget.findMany({ where: { userId: user.id } }), prisma.recurringPayment.findMany({ where: { userId: user.id } }),
    ]);
    const backup = { version: 3, exportedAt: new Date().toISOString(), owner: { name: user.name, baseCurrency: user.baseCurrency }, accounts, categories, transactions, budgets, recurringPayments };
    return new NextResponse(JSON.stringify(backup), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error('Backup export failed', error); return NextResponse.json({ success: false, error: 'Unable to export your backup' }, { status: 500 }); }
}

function isObject(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function string(value: unknown, max: number) { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null; }
function minor(value: unknown, signed = false) { return typeof value === 'number' && Number.isInteger(value) && (signed ? Math.abs(value) <= 2_147_483_647 : value > 0 && value <= 2_147_483_647) ? value : null; }

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const body = await request.json(); const data = body?.type === 'RESTORE_JSON' ? body.data : null;
    if (!isObject(data) || data.version !== 3 || !Array.isArray(data.accounts) || !Array.isArray(data.categories) || !Array.isArray(data.transactions)) return NextResponse.json({ success: false, error: 'Choose an Expense Tracker backup created by this version of the app' }, { status: 400 });
    const accounts = data.accounts as unknown[]; const categories = data.categories as unknown[]; const transactions = data.transactions as unknown[];
    if (accounts.length > 100 || categories.length > 250 || transactions.length > 5_000) return NextResponse.json({ success: false, error: 'This backup is too large to import safely' }, { status: 413 });
    let imported = 0; let skipped = 0;
    await prisma.$transaction(async (client) => {
      const accountMap = new Map<string, string>(); const categoryMap = new Map<string, string>();
      for (const item of categories) {
        if (!isObject(item)) throw new Error('Invalid category in backup');
        const name = string(item.name, 60); const type = item.type;
        if (!name || (type !== 'EXPENSE' && type !== 'INCOME')) throw new Error('Invalid category in backup');
        const existing = await client.category.findFirst({ where: { userId: user.id, name, type } });
        const category = existing ?? await client.category.create({ data: { userId: user.id, name, type, icon: string(item.icon, 40) ?? 'tag', color: typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#64748B' } });
        if (typeof item.id === 'string') categoryMap.set(item.id, category.id);
      }
      for (const item of accounts) {
        if (!isObject(item)) throw new Error('Invalid account in backup');
        const name = string(item.name, 80); const type = item.type; const currency = item.currency; const balanceMinor = minor(item.balanceMinor, true);
        if (!name || typeof type !== 'string' || !types.has(type) || typeof currency !== 'string' || currency !== user.baseCurrency || balanceMinor === null) throw new Error('Invalid account in backup');
        const existing = await client.account.findFirst({ where: { userId: user.id, name } });
        const account = existing ?? await client.account.create({ data: { userId: user.id, name, type, currency, balanceMinor, isArchived: item.isArchived === true } });
        if (typeof item.id === 'string') accountMap.set(item.id, account.id);
      }
      for (const item of transactions) {
        if (!isObject(item)) throw new Error('Invalid transaction in backup');
        const accountId = typeof item.accountId === 'string' ? accountMap.get(item.accountId) : undefined; const toAccountId = typeof item.toAccountId === 'string' ? accountMap.get(item.toAccountId) ?? null : null; const categoryId = typeof item.categoryId === 'string' ? categoryMap.get(item.categoryId) ?? null : null;
        const amountMinor = minor(item.amountMinor); const type = item.type; const currency = item.currency; const date = typeof item.date === 'string' ? new Date(item.date) : null;
        if (!accountId || amountMinor === null || typeof type !== 'string' || !transactionTypes.has(type) || currency !== user.baseCurrency || !date || Number.isNaN(date.getTime()) || (type === 'TRANSFER' && !toAccountId)) throw new Error('Invalid transaction in backup');
        const payee = typeof item.payee === 'string' ? item.payee.slice(0, 140) : null;
        const duplicate = await client.transaction.findFirst({ where: { userId: user.id, accountId, date, amountMinor, type, payee } });
        if (duplicate) { skipped += 1; continue; }
        await client.transaction.create({ data: { userId: user.id, accountId, toAccountId: type === 'TRANSFER' ? toAccountId : null, categoryId: type === 'TRANSFER' ? null : categoryId, amountMinor, currency, type, date, payee, notes: typeof item.notes === 'string' ? item.notes.slice(0, 2_000) : null, tags: typeof item.tags === 'string' ? item.tags.slice(0, 300) : null, isRecurring: item.isRecurring === true } }); imported += 1;
      }
    }, { timeout: 20_000 });
    return NextResponse.json({ success: true, data: { imported, skipped } });
  } catch (error) { console.error('Backup restore failed', error); return NextResponse.json({ success: false, error: 'This backup could not be imported. Your existing data was not changed.' }, { status: 400 }); }
}
