import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { TransactionInputSchema } from '@/lib/validation';
import { addMoney, subtractMoney } from '@/lib/money';

// Helper to get default user
async function getDefaultUser() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'user@expensetracker.pro',
        name: 'Personal User',
        baseCurrency: 'INR',
      },
    });
  }
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getDefaultUser();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { userId: user.id };

    if (search) {
      where.OR = [
        { payee: { contains: search } },
        { notes: { contains: search } },
        { tags: { contains: search } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (accountId) where.accountId = accountId;
    if (type && ['EXPENSE', 'INCOME', 'TRANSFER'].includes(type)) where.type = type;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (where.date as Record<string, unknown>).lte = end;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
        toAccount: true,
      },
      orderBy: { date: 'desc' },
      take: 200,
    });

    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Transactions GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getDefaultUser();
    const body = await req.json();

    const parseResult = TransactionInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { amount, currency, type, date, accountId, toAccountId, categoryId, payee, notes, tags } =
      parseResult.data;

    // Check source account
    const sourceAccount = await prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!sourceAccount) {
      return NextResponse.json({ success: false, error: 'Source account not found' }, { status: 404 });
    }

    // Atomic transaction: Create record and update account balances
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          accountId,
          toAccountId: type === 'TRANSFER' ? toAccountId : null,
          categoryId: type !== 'TRANSFER' ? categoryId : null,
          amount,
          currency: currency || user.baseCurrency,
          type,
          date,
          payee: payee || (type === 'TRANSFER' ? 'Account Transfer' : 'Expense'),
          notes,
          tags,
        },
        include: {
          category: true,
          account: true,
        },
      });

      // Update balances using money utility
      if (type === 'INCOME') {
        const newBalance = addMoney(sourceAccount.balance, amount, sourceAccount.currency);
        await tx.account.update({
          where: { id: accountId },
          data: { balance: newBalance },
        });
      } else if (type === 'EXPENSE') {
        const newBalance = subtractMoney(sourceAccount.balance, amount, sourceAccount.currency);
        await tx.account.update({
          where: { id: accountId },
          data: { balance: newBalance },
        });
      } else if (type === 'TRANSFER' && toAccountId) {
        const toAccount = await tx.account.findUnique({ where: { id: toAccountId } });
        if (toAccount) {
          const newSrc = subtractMoney(sourceAccount.balance, amount, sourceAccount.currency);
          const newDst = addMoney(toAccount.balance, amount, toAccount.currency);
          await tx.account.update({ where: { id: accountId }, data: { balance: newSrc } });
          await tx.account.update({ where: { id: toAccountId }, data: { balance: newDst } });
        }
      }

      return transaction;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error('Transactions POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create transaction' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    const txRecord = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true, toAccount: true },
    });
    if (!txRecord) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    // Atomic delete with balance reversal
    await prisma.$transaction(async (tx) => {
      if (txRecord.type === 'INCOME') {
        const reversed = subtractMoney(txRecord.account.balance, txRecord.amount, txRecord.account.currency);
        await tx.account.update({ where: { id: txRecord.accountId }, data: { balance: reversed } });
      } else if (txRecord.type === 'EXPENSE') {
        const reversed = addMoney(txRecord.account.balance, txRecord.amount, txRecord.account.currency);
        await tx.account.update({ where: { id: txRecord.accountId }, data: { balance: reversed } });
      } else if (txRecord.type === 'TRANSFER' && txRecord.toAccountId && txRecord.toAccount) {
        const reversedSrc = addMoney(txRecord.account.balance, txRecord.amount, txRecord.account.currency);
        const reversedDst = subtractMoney(txRecord.toAccount.balance, txRecord.amount, txRecord.toAccount.currency);
        await tx.account.update({ where: { id: txRecord.accountId }, data: { balance: reversedSrc } });
        await tx.account.update({ where: { id: txRecord.toAccountId }, data: { balance: reversedDst } });
      }

      await tx.transaction.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Transactions DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete transaction' }, { status: 500 });
  }
}
