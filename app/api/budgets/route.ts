import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { fromMinorUnits } from '@/lib/money';
import { BudgetInputSchema } from '@/lib/validation';

function unauthorized() { return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 }); }
function monthRange(year: number, month: number) { return { gte: new Date(Date.UTC(year, month - 1, 1)), lte: new Date(Date.UTC(year, month, 1) - 1) }; }

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  const now = new Date(); const month = Number(request.nextUrl.searchParams.get('month') ?? now.getUTCMonth() + 1); const year = Number(request.nextUrl.searchParams.get('year') ?? now.getUTCFullYear());
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2020 || year > 2099) return NextResponse.json({ success: false, error: 'Invalid report month' }, { status: 400 });
  try {
    const [budgets, expenses] = await Promise.all([
      prisma.budget.findMany({ where: { userId: user.id, month, year }, include: { category: true }, orderBy: { createdAt: 'asc' } }),
      prisma.transaction.findMany({ where: { userId: user.id, type: 'EXPENSE', date: monthRange(year, month) }, select: { categoryId: true, amountMinor: true } }),
    ]);
    const spendByCategory = new Map<string, number>(); let totalMinor = 0;
    for (const expense of expenses) { totalMinor += expense.amountMinor; if (expense.categoryId) spendByCategory.set(expense.categoryId, (spendByCategory.get(expense.categoryId) ?? 0) + expense.amountMinor); }
    const data = budgets.map((budget) => {
      const spentMinor = budget.categoryId ? spendByCategory.get(budget.categoryId) ?? 0 : totalMinor;
      const remainingMinor = budget.amountMinor - spentMinor;
      const percentUsed = budget.amountMinor === 0 ? 0 : Math.round((spentMinor / budget.amountMinor) * 100);
      return { id: budget.id, categoryId: budget.categoryId, categoryName: budget.category?.name ?? 'Overall monthly spending', categoryColor: budget.category?.color ?? '#64748B', limit: fromMinorUnits(budget.amountMinor, user.baseCurrency), spent: fromMinorUnits(spentMinor, user.baseCurrency), remaining: fromMinorUnits(remainingMinor, user.baseCurrency), limitMinor: budget.amountMinor, spentMinor, remainingMinor, percentUsed, isOverspent: remainingMinor < 0, isWarning: percentUsed >= budget.alertThreshold * 100, month: budget.month, year: budget.year };
    });
    return NextResponse.json({ success: true, data });
  } catch (error) { console.error('Budgets query failed', error); return NextResponse.json({ success: false, error: 'Unable to load budgets' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const parsed = BudgetInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid budget' }, { status: 400 });
    const input = parsed.data as typeof parsed.data & { amountMinor: number };
    if (input.currency !== user.baseCurrency) return NextResponse.json({ success: false, error: `Budgets use your base currency (${user.baseCurrency})` }, { status: 422 });
    if (input.categoryId && !await prisma.category.findFirst({ where: { id: input.categoryId, userId: user.id, type: 'EXPENSE' } })) return NextResponse.json({ success: false, error: 'The selected category is unavailable' }, { status: 422 });
    const now = new Date(); const month = input.month ?? now.getUTCMonth() + 1; const year = input.year ?? now.getUTCFullYear();
    const existing = await prisma.budget.findFirst({ where: { userId: user.id, categoryId: input.categoryId ?? null, month, year } });
    const budget = existing ? await prisma.budget.update({ where: { id: existing.id }, data: { amountMinor: input.amountMinor, alertThreshold: input.alertThreshold } }) : await prisma.budget.create({ data: { userId: user.id, categoryId: input.categoryId ?? null, amountMinor: input.amountMinor, period: 'MONTHLY', month, year, alertThreshold: input.alertThreshold } });
    return NextResponse.json({ success: true, data: budget }, { status: existing ? 200 : 201 });
  } catch (error) { console.error('Budget save failed', error); return NextResponse.json({ success: false, error: 'Unable to save this budget' }, { status: 500 }); }
}
