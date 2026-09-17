import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { fromMinorUnits } from '@/lib/money';
import { generateExecutiveMonthlyPdf } from '@/lib/pdf-generator';

function monthRange(year: number, month: number) { return { gte: new Date(Date.UTC(year, month - 1, 1)), lte: new Date(Date.UTC(year, month, 1) - 1) }; }

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
  const now = new Date(); const month = Number(request.nextUrl.searchParams.get('month') ?? now.getUTCMonth() + 1); const year = Number(request.nextUrl.searchParams.get('year') ?? now.getUTCFullYear());
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2020 || year > 2099) return NextResponse.json({ success: false, error: 'Invalid report period' }, { status: 400 });
  try {
    const [transactions, budgets] = await Promise.all([
      prisma.transaction.findMany({ where: { userId: user.id, date: monthRange(year, month) }, include: { category: true, account: true }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] }),
      prisma.budget.findMany({ where: { userId: user.id, month, year }, include: { category: true } }),
    ]);
    let incomeMinor = 0; let expenseMinor = 0;
    const categoryMinor = new Map<string, { name: string; totalMinor: number }>();
    for (const transaction of transactions) {
      if (transaction.type === 'INCOME') incomeMinor += transaction.amountMinor;
      if (transaction.type === 'EXPENSE') {
        expenseMinor += transaction.amountMinor;
        const name = transaction.category?.name ?? 'Uncategorized';
        const current = categoryMinor.get(name) ?? { name, totalMinor: 0 }; current.totalMinor += transaction.amountMinor; categoryMinor.set(name, current);
      }
    }
    const categories = [...categoryMinor.values()].map((item) => ({ name: item.name, type: 'EXPENSE' as const, total: fromMinorUnits(item.totalMinor, user.baseCurrency), percentage: expenseMinor ? item.totalMinor / expenseMinor * 100 : 0 })).sort((a, b) => b.total - a.total);
    const budgetData = budgets.map((budget) => {
      const spentMinor = budget.categoryId ? categoryMinor.get(budget.category?.name ?? '')?.totalMinor ?? 0 : expenseMinor;
      return { categoryName: budget.category?.name ?? 'Overall monthly spending', limit: fromMinorUnits(budget.amountMinor, user.baseCurrency), spent: fromMinorUnits(spentMinor, user.baseCurrency), variance: fromMinorUnits(budget.amountMinor - spentMinor, user.baseCurrency), percentUsed: budget.amountMinor ? spentMinor / budget.amountMinor * 100 : 0 };
    });
    const netMinor = incomeMinor - expenseMinor;
    const pdf = await generateExecutiveMonthlyPdf({ periodMonth: month, periodYear: year, currency: user.baseCurrency, userName: user.name, totalIncome: fromMinorUnits(incomeMinor, user.baseCurrency), totalExpenses: fromMinorUnits(expenseMinor, user.baseCurrency), netSavings: fromMinorUnits(netMinor, user.baseCurrency), savingsRate: incomeMinor ? Math.max(0, netMinor / incomeMinor * 100) : 0, categories, budgets: budgetData, transactions: transactions.map((transaction) => ({ date: transaction.date, payee: transaction.payee ?? (transaction.type === 'TRANSFER' ? 'Account transfer' : 'Transaction'), category: transaction.category?.name ?? (transaction.type === 'TRANSFER' ? 'Transfer' : 'Uncategorized'), account: transaction.account.name, type: transaction.type as 'EXPENSE' | 'INCOME' | 'TRANSFER', amount: fromMinorUnits(transaction.amountMinor, user.baseCurrency) })) });
    await prisma.report.create({ data: { userId: user.id, month, year, title: `Monthly statement — ${year}-${String(month).padStart(2, '0')}`, totalIncomeMinor: incomeMinor, totalExpenseMinor: expenseMinor, netSavingsMinor: netMinor } });
    return new NextResponse(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="expense-tracker-statement-${year}-${String(month).padStart(2, '0')}.pdf"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error('PDF generation failed', error); return NextResponse.json({ success: false, error: 'Unable to generate this report' }, { status: 500 }); }
}
