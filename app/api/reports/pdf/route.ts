import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateExecutiveMonthlyPdf } from '@/lib/pdf-generator';
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

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // 1. Fetch transactions for the selected month
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        category: true,
        account: true,
      },
      orderBy: { date: 'asc' },
    });

    // 2. Fetch budgets for the month
    const budgets = await prisma.budget.findMany({
      where: { userId: user.id, month, year },
      include: { category: true },
    });

    // 3. Compute totals
    let totalIncome = 0;
    let totalExpenses = 0;
    const catSpentMap: Record<string, { name: string; type: 'EXPENSE' | 'INCOME'; total: number }> = {};

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        totalIncome = addMoney(totalIncome, tx.amount, tx.currency);
      } else if (tx.type === 'EXPENSE') {
        totalExpenses = addMoney(totalExpenses, tx.amount, tx.currency);
        const catName = tx.category?.name || 'Uncategorized';
        if (!catSpentMap[catName]) {
          catSpentMap[catName] = { name: catName, type: 'EXPENSE', total: 0 };
        }
        catSpentMap[catName].total = addMoney(catSpentMap[catName].total, tx.amount, tx.currency);
      }
    }

    const netSavings = subtractMoney(totalIncome, totalExpenses);
    const savingsRate = totalIncome > 0 ? Math.max(0, (netSavings / totalIncome) * 100) : 0;

    const categoriesList = Object.values(catSpentMap).map((c) => ({
      ...c,
      percentage: totalExpenses > 0 ? (c.total / totalExpenses) * 100 : 0,
    })).sort((a, b) => b.total - a.total);

    const budgetList = budgets.map((b) => {
      const catName = b.category?.name || 'Overall Monthly';
      const spent = catSpentMap[catName]?.total || 0;
      return {
        categoryName: catName,
        limit: b.amount,
        spent,
        variance: subtractMoney(b.amount, spent),
        percentUsed: b.amount > 0 ? (spent / b.amount) * 100 : 0,
      };
    });

    const pdfBuffer = await generateExecutiveMonthlyPdf({
      periodMonth: month,
      periodYear: year,
      currency: user.baseCurrency,
      userName: user.name,
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      categories: categoriesList,
      budgets: budgetList,
      transactions: transactions.map((t) => ({
        date: t.date,
        payee: t.payee || 'Expense',
        category: t.category?.name || 'General',
        account: t.account.name,
        type: t.type as 'EXPENSE' | 'INCOME' | 'TRANSFER',
        amount: t.amount,
      })),
    });

    // Save report record in DB
    await prisma.report.create({
      data: {
        userId: user.id,
        month,
        year,
        title: `Monthly Financial Statement - ${month}/${year}`,
        totalIncome,
        totalExpense: totalExpenses,
        netSavings,
      },
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Monthly_Report_${year}_${String(month).padStart(2, '0')}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate PDF report' }, { status: 500 });
  }
}
