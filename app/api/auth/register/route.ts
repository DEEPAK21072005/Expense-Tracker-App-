import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createSession, publicUser } from '@/lib/auth';
import { RegisterInputSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid account details' }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return NextResponse.json({ success: false, error: 'An account already exists for this email address' }, { status: 409 });
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        baseCurrency: parsed.data.baseCurrency,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        categories: {
          create: [
            { name: 'Food & Dining', type: 'EXPENSE', icon: 'utensils', color: '#f97316' },
            { name: 'Groceries', type: 'EXPENSE', icon: 'shopping-cart', color: '#10b981' },
            { name: 'Housing & Rent', type: 'EXPENSE', icon: 'home', color: '#3b82f6' },
            { name: 'Transportation', type: 'EXPENSE', icon: 'car', color: '#6366f1' },
            { name: 'Utilities & Bills', type: 'EXPENSE', icon: 'zap', color: '#eab308' },
            { name: 'Healthcare', type: 'EXPENSE', icon: 'activity', color: '#ec4899' },
            { name: 'Entertainment', type: 'EXPENSE', icon: 'film', color: '#8b5cf6' },
            { name: 'Shopping', type: 'EXPENSE', icon: 'tag', color: '#14b8a6' },
            { name: 'Salary', type: 'INCOME', icon: 'briefcase', color: '#059669' },
            { name: 'Investments', type: 'INCOME', icon: 'trending-up', color: '#2563eb' },
            { name: 'Other Income', type: 'INCOME', icon: 'dollar-sign', color: '#10b981' },
          ],
        },
      },
    });
    const response = NextResponse.json({ success: true, data: publicUser(user) }, { status: 201 });
    await createSession(user.id, response);
    return response;
  } catch (error) {
    console.error('Registration failed', error);
    return NextResponse.json({ success: false, error: 'Unable to create your account. Please try again.' }, { status: 500 });
  }
}
