import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { RecurringPaymentInputSchema } from '@/lib/validation';

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
    const recurring = await prisma.recurringPayment.findMany({
      where: { userId: user.id },
      include: {
        account: true,
        category: true,
      },
      orderBy: { nextDate: 'asc' },
    });

    return NextResponse.json({ success: true, data: recurring });
  } catch (error) {
    console.error('Recurring GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch recurring payments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getDefaultUser();
    const body = await req.json();

    const parseResult = RecurringPaymentInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { description, amount, currency, frequency, nextDate, accountId, categoryId } = parseResult.data;

    const recurring = await prisma.recurringPayment.create({
      data: {
        userId: user.id,
        description,
        amount,
        currency: currency || user.baseCurrency,
        frequency,
        nextDate,
        accountId,
        categoryId,
      },
      include: {
        account: true,
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: recurring }, { status: 201 });
  } catch (error) {
    console.error('Recurring POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create recurring payment' }, { status: 500 });
  }
}
