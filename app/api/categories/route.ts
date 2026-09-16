import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { CategoryInputSchema } from '@/lib/validation';

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
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Categories GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getDefaultUser();
    const body = await req.json();

    const parseResult = CategoryInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { name, type, icon, color } = parseResult.data;
    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name,
        type,
        icon,
        color,
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('Categories POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
  }
}
