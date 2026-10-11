import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createSession, DEFAULT_CATEGORIES, publicUser } from '@/lib/auth';
import { RegisterInputSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid account details' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    let existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
      existing = (allUsers.find((u) => u.email.toLowerCase() === email) as any) || null;
    }
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account already exists with this email address. Please sign in instead.' },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        baseCurrency: parsed.data.baseCurrency,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        categories: {
          create: DEFAULT_CATEGORIES,
        },
        accounts: {
          create: [
            {
              name: 'Primary Account',
              type: 'BANK',
              currency: parsed.data.baseCurrency,
              balanceMinor: 0,
            },
          ],
        },
      },
    });

    const response = NextResponse.json({ success: true, data: publicUser(user) }, { status: 201 });
    await createSession(user, response);
    return response;
  } catch (error: any) {
    console.error('Registration failed:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An account already exists with this email address. Please sign in instead.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Unable to create your account. Please try again.' },
      { status: 500 }
    );
  }
}
