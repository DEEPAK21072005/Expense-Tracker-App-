import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { BudgetInputSchema } from '@/lib/validation';
import { addMoney, subtractMoney } from '@/lib/money';

async function getDefaultUser() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: 'user@expensetracker.pro', name: 'Personal User', baseCurrency: 'INR' },
    });
  }
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getDefaultUser();
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);

    const budgets = await prisma.budget.findMany({
      where: {
        userId: user.id,
        month,
        year,
      },
      include: {
        category: true,
      },
    });

    // Date range for this month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all expense transactions in this month
    const monthlyExpenses = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'EXPENSE',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    // Compute spent amount per category
    const spentByCat: Record<string, number> = {};
    let totalSpent = 0;

    for (const tx of monthlyExpenses) {
      if (tx.categoryId) {
        spentByCat[tx.categoryId] = addMoney(spentByCat[tx.categoryId] || 0, tx.amount, tx.currency);
      }
      totalSpent = addMoney(totalSpent, tx.amount, tx.currency);
    }

    const budgetMetrics = budgets.map((b) => {
      const spent = b.categoryId ? spentByCat[b.categoryId] || 0 : totalSpent;
      const remaining = subtractMoney(b.amount, spent);
      const percentUsed = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      const isOverspent = remaining < 0;
      const isWarning = percentUsed >= (b.alertThreshold * 100);

      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.category?.name || 'Overall Monthly Spending',
        categoryColor: b.category?.color || '#3B82F6',
        limit: b.amount,
        spent,
        remaining,
        percentUsed,
        isOverspent,
        isWarning,
        month: b.month,
        year: b.year,
      };
    });

    return NextResponse.json({ success: true, data: budgetMetrics });
  } catch (error) {
    console.error('Budgets GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getDefaultUser();
    const body = await req.json();

    const parseResult = BudgetInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { categoryId, amount, period, month, year, alertThreshold } = parseResult.data;
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Check if budget already exists for this category/period
    const existing = await prisma.budget.findFirst({
      where: {
        userId: user.id,
        categoryId: categoryId || null,
        month: targetMonth,
        year: targetYear,
      },
    });

    let budget;
    if (existing) {
      budget = await prisma.budget.update({
        where: { id: existing.id },
        data: { amount, alertThreshold: alertThreshold || 0.85 },
      });
    } else {
      budget = await prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: categoryId || null,
          amount,
          period,
          month: targetMonth,
          year: targetYear,
          alertThreshold: alertThreshold || 0.85,
        },
      });
    }

    return NextResponse.json({ success: true, data: budget }, { status: 200 });
  } catch (error) {
    console.error('Budgets POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create budget' }, { status: 500 });
  }
}
