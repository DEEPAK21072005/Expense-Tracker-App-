import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { AccountInputSchema } from '@/lib/validation';

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
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Accounts GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getDefaultUser();
    const body = await req.json();

    const parseResult = AccountInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { name, type, currency, balance } = parseResult.data;
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        name,
        type,
        currency: currency || user.baseCurrency,
        balance,
      },
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error) {
    console.error('Accounts POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create account' }, { status: 500 });
  }
}
