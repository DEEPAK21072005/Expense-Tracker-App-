import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

async function getDefaultUser() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: 'user@expensetracker.pro', name: 'Personal User', baseCurrency: 'INR' },
    });
  }
  return user;
}

export async function GET() {
  try {
    const user = await getDefaultUser();

    const [accounts, categories, transactions, budgets, recurringPayments, splitGroups] =
      await Promise.all([
        prisma.account.findMany({ where: { userId: user.id } }),
        prisma.category.findMany({ where: { userId: user.id } }),
        prisma.transaction.findMany({ where: { userId: user.id } }),
        prisma.budget.findMany({ where: { userId: user.id } }),
        prisma.recurringPayment.findMany({ where: { userId: user.id } }),
        prisma.expenseSplitGroup.findMany({
          where: { userId: user.id },
          include: {
            members: true,
            expenses: { include: { shares: true } },
          },
        }),
      ]);

    const exportData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        baseCurrency: user.baseCurrency,
      },
      accounts,
      categories,
      transactions,
      budgets,
      recurringPayments,
      splitGroups,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ExpenseTracker_Backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Backup export error:', error);
    return NextResponse.json({ success: false, error: 'Failed to export backup' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getDefaultUser();
    const body = await req.json();

    if (body.type === 'RESTORE_JSON' && body.data) {
      const { accounts, categories, transactions } = body.data;
      let importedCount = 0;

      // Import categories
      const categoryMap = new Map<string, string>();
      if (Array.isArray(categories)) {
        for (const cat of categories) {
          const existing = await prisma.category.findFirst({
            where: { userId: user.id, name: cat.name },
          });
          if (existing) {
            categoryMap.set(cat.id || cat.name, existing.id);
          } else {
            const created = await prisma.category.create({
              data: {
                userId: user.id,
                name: cat.name,
                type: cat.type || 'EXPENSE',
                color: cat.color || '#3B82F6',
              },
            });
            categoryMap.set(cat.id || cat.name, created.id);
          }
        }
      }

      // Import accounts
      const accountMap = new Map<string, string>();
      if (Array.isArray(accounts)) {
        for (const acc of accounts) {
          const existing = await prisma.account.findFirst({
            where: { userId: user.id, name: acc.name },
          });
          if (existing) {
            accountMap.set(acc.id || acc.name, existing.id);
          } else {
            const created = await prisma.account.create({
              data: {
                userId: user.id,
                name: acc.name,
                type: acc.type || 'BANK',
                currency: acc.currency || user.baseCurrency,
                balance: acc.balance || 0,
              },
            });
            accountMap.set(acc.id || acc.name, created.id);
          }
        }
      }

      // Primary account fallback
      const defaultAccount = await prisma.account.findFirst({ where: { userId: user.id } });

      // Import transactions with duplicate detection
      if (Array.isArray(transactions) && defaultAccount) {
        for (const tx of transactions) {
          const targetAccountId = accountMap.get(tx.accountId) || defaultAccount.id;
          const targetCategoryId = tx.categoryId ? categoryMap.get(tx.categoryId) || null : null;
          const txDate = new Date(tx.date);

          // Duplicate detection by payee + date + amount
          const existing = await prisma.transaction.findFirst({
            where: {
              userId: user.id,
              payee: tx.payee,
              date: txDate,
              amount: tx.amount,
            },
          });

          if (!existing) {
            await prisma.transaction.create({
              data: {
                userId: user.id,
                accountId: targetAccountId,
                categoryId: targetCategoryId,
                amount: tx.amount,
                currency: tx.currency || user.baseCurrency,
                type: tx.type || 'EXPENSE',
                date: txDate,
                payee: tx.payee || 'Expense',
                notes: tx.notes,
                tags: tx.tags,
              },
            });
            importedCount++;
          }
        }
      }

      return NextResponse.json({ success: true, message: `Successfully imported ${importedCount} records` });
    }

    return NextResponse.json({ success: false, error: 'Invalid import payload' }, { status: 400 });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: 'Failed to import data' }, { status: 500 });
  }
}
