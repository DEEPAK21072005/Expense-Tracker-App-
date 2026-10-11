import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  attachLedgerSyncCookie,
  createSession,
  deterministicCuid,
  getDefaultAccountData,
  getDefaultCategoriesData,
  publicUser,
  syncVaultUserToDb,
} from '@/lib/auth';
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

    await syncVaultUserToDb();

    const email = parsed.data.email.toLowerCase().trim();
    let existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const allUsers = await prisma.user.findMany();
      existing = allUsers.find((u) => u.email.toLowerCase() === email) || null;
    }
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account already exists with this email address. Please sign in instead.' },
        { status: 409 }
      );
    }

    const userId = deterministicCuid(email, 'user');
    const user = await prisma.user.create({
      data: {
        id: userId,
        name: parsed.data.name,
        email,
        baseCurrency: parsed.data.baseCurrency,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        categories: {
          create: getDefaultCategoriesData(userId),
        },
        accounts: {
          create: [getDefaultAccountData(userId, parsed.data.baseCurrency)],
        },
      },
    });

    const response = NextResponse.json({ success: true, data: publicUser(user) }, { status: 201 });
    await createSession(user, response);
    await attachLedgerSyncCookie(user.id, response);
    return response;
  } catch (error: unknown) {
    console.error('Registration failed:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
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
