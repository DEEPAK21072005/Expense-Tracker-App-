import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateSettlements, distributeEqualShares } from '@/lib/money';
import { SplitGroupInputSchema, SplitExpenseInputSchema } from '@/lib/validation';

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
    const groups = await prisma.expenseSplitGroup.findMany({
      where: { userId: user.id },
      include: {
        members: true,
        expenses: {
          include: {
            paidBy: true,
            shares: { include: { member: true } },
          },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Compute settlement matrix for each group
    const enrichedGroups = groups.map((g) => {
      const { balances, settlements } = calculateSettlements(
        g.members.map((m) => ({ id: m.id, name: m.name })),
        g.expenses.map((e) => ({
          paidById: e.paidById,
          amount: e.amount,
          shares: e.shares.map((s) => ({ memberId: s.memberId, shareAmount: s.shareAmount })),
        })),
        'INR'
      );

      const totalGroupSpent = g.expenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        ...g,
        totalGroupSpent,
        balances,
        settlements,
      };
    });

    return NextResponse.json({ success: true, data: enrichedGroups });
  } catch (error) {
    console.error('Split GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch split groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getDefaultUser();
    const body = await req.json();

    // Check if this is creating a group or creating an expense inside a group
    if (body.action === 'CREATE_GROUP') {
      const parseResult = SplitGroupInputSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, error: parseResult.error.errors[0]?.message },
          { status: 400 }
        );
      }

      const { name, description, members } = parseResult.data;
      const group = await prisma.expenseSplitGroup.create({
        data: {
          userId: user.id,
          name,
          description,
          members: {
            create: members.map((mName) => ({ name: mName.trim() })),
          },
        },
        include: { members: true },
      });

      return NextResponse.json({ success: true, data: group }, { status: 201 });
    }

    // Otherwise, creating a split expense
    const parseResult = SplitExpenseInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { groupId, paidById, description, amount, currency, date, splitType, customShares } =
      parseResult.data;

    const group = await prisma.expenseSplitGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    // Determine shares
    let sharesData: Array<{ memberId: string; shareAmount: number }> = [];

    if (splitType === 'EQUAL') {
      const shares = distributeEqualShares(amount, group.members.length, currency);
      sharesData = group.members.map((m, idx) => ({
        memberId: m.id,
        shareAmount: shares[idx] || 0,
      }));
    } else if (customShares && customShares.length > 0) {
      sharesData = customShares;
    }

    const expense = await prisma.splitExpense.create({
      data: {
        groupId,
        paidById,
        description,
        amount,
        currency,
        date,
        splitType,
        shares: {
          create: sharesData,
        },
      },
      include: {
        paidBy: true,
        shares: { include: { member: true } },
      },
    });

    // Update group timestamp
    await prisma.expenseSplitGroup.update({
      where: { id: groupId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error) {
    console.error('Split POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process split action' }, { status: 500 });
  }
}
