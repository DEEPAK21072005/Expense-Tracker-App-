import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createSession, publicUser } from '@/lib/auth';
import { LoginInputSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Enter a valid email address and password' },
        { status: 400 }
      );
    }
    const email = parsed.data.email.toLowerCase().trim();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Case-insensitive fallback for SQLite
      const allUsers = await prisma.user.findMany();
      user = allUsers.find((u) => u.email.toLowerCase() === email) || null;
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json({ success: false, error: 'Incorrect email address or password' }, { status: 401 });
    }
    const isPasswordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, error: 'Incorrect email address or password' }, { status: 401 });
    }
    const response = NextResponse.json({ success: true, data: publicUser(user) });
    await createSession(user, response, parsed.data.rememberMe ?? true);
    return response;
  } catch (error) {
    console.error('Login failed', error);
    return NextResponse.json({ success: false, error: 'Unable to sign in. Please check your connection and try again.' }, { status: 500 });
  }
}
