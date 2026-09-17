import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { calculateSettlements, distributeEqualMinorUnits, fromMinorUnits, parseAmountToMinor } from '@/lib/money';
import { SplitExpenseInputSchema, SplitGroupInputSchema } from '@/lib/validation';

function unauthorized() { return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 }); }

export async function GET() {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const groups = await prisma.expenseSplitGroup.findMany({ where: { userId: user.id }, include: { members: true, expenses: { include: { paidBy: true, shares: { include: { member: true } }, }, orderBy: { date: 'desc' } } }, orderBy: { updatedAt: 'desc' } });
    const data = groups.map((group) => {
      const expenses = group.expenses.map((expense) => ({ ...expense, amount: fromMinorUnits(expense.amountMinor, expense.currency), shares: expense.shares.map((share) => ({ ...share, shareAmount: fromMinorUnits(share.shareMinor, expense.currency) })) }));
      const { balances, settlements } = calculateSettlements(group.members.map((member) => ({ id: member.id, name: member.name })), expenses.map((expense) => ({ paidById: expense.paidById, amount: expense.amount, shares: expense.shares.map((share) => ({ memberId: share.memberId, shareAmount: share.shareAmount })) })), user.baseCurrency);
      const totalMinor = group.expenses.reduce((total, expense) => total + expense.amountMinor, 0);
      return { ...group, expenses, totalGroupSpent: fromMinorUnits(totalMinor, user.baseCurrency), totalGroupSpentMinor: totalMinor, balances, settlements };
    });
    return NextResponse.json({ success: true, data });
  } catch (error) { console.error('Split query failed', error); return NextResponse.json({ success: false, error: 'Unable to load split groups' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const body = await request.json();
    if (body.action === 'CREATE_GROUP') {
      const parsed = SplitGroupInputSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid group' }, { status: 400 });
      const uniqueMembers = [...new Set(parsed.data.members.map((name) => name.trim()))];
      if (uniqueMembers.length < 2) return NextResponse.json({ success: false, error: 'Use at least two different member names' }, { status: 400 });
      const group = await prisma.expenseSplitGroup.create({ data: { userId: user.id, name: parsed.data.name, description: parsed.data.description, members: { create: uniqueMembers.map((name) => ({ name })) } }, include: { members: true } });
      return NextResponse.json({ success: true, data: group }, { status: 201 });
    }
    const parsed = SplitExpenseInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid split expense' }, { status: 400 });
    const input = parsed.data;
    if (input.currency !== user.baseCurrency) return NextResponse.json({ success: false, error: `Splits use your base currency (${user.baseCurrency})` }, { status: 422 });
    const group = await prisma.expenseSplitGroup.findFirst({ where: { id: input.groupId, userId: user.id }, include: { members: true } });
    if (!group) return NextResponse.json({ success: false, error: 'Split group not found' }, { status: 404 });
    const memberIds = new Set(group.members.map((member) => member.id));
    if (!memberIds.has(input.paidById)) return NextResponse.json({ success: false, error: 'Payer must be a member of this group' }, { status: 422 });
    const amountMinor = parseAmountToMinor(input.amount, input.currency);
    let shares: Array<{ memberId: string; shareMinor: number }>;
    if (input.splitType === 'EQUAL') shares = group.members.map((member, index) => ({ memberId: member.id, shareMinor: distributeEqualMinorUnits(amountMinor, group.members.length)[index] }));
    else {
      if (!input.customShares || input.customShares.length !== group.members.length || new Set(input.customShares.map((share) => share.memberId)).size !== group.members.length || input.customShares.some((share) => !memberIds.has(share.memberId))) return NextResponse.json({ success: false, error: 'Custom shares must include each group member exactly once' }, { status: 422 });
      shares = input.customShares.map((share) => ({ memberId: share.memberId, shareMinor: parseAmountToMinor(share.shareAmount, input.currency) }));
      if (shares.reduce((total, share) => total + share.shareMinor, 0) !== amountMinor) return NextResponse.json({ success: false, error: 'Custom shares must exactly equal the total amount' }, { status: 422 });
    }
    const expense = await prisma.$transaction(async (client) => {
      const created = await client.splitExpense.create({ data: { groupId: group.id, paidById: input.paidById, description: input.description, amountMinor, currency: input.currency, date: input.date, splitType: input.splitType, shares: { create: shares } }, include: { paidBy: true, shares: { include: { member: true } } } });
      await client.expenseSplitGroup.update({ where: { id: group.id }, data: { updatedAt: new Date() } }); return created;
    });
    return NextResponse.json({ success: true, data: { ...expense, amount: fromMinorUnits(expense.amountMinor, expense.currency), shares: expense.shares.map((share) => ({ ...share, shareAmount: fromMinorUnits(share.shareMinor, expense.currency) })) } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return NextResponse.json({ success: false, error: 'A group with this name already exists' }, { status: 409 });
    console.error('Split save failed', error); return NextResponse.json({ success: false, error: 'Unable to save this split expense' }, { status: 500 });
  }
}
