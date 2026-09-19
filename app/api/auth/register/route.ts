import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createSession, DEFAULT_CATEGORIES, publicUser } from '@/lib/auth';
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
  } catch (error) {
    console.error('Registration failed', error);
    return NextResponse.json({ success: false, error: 'Unable to create your account. Please try again.' }, { status: 500 });
  }
}
