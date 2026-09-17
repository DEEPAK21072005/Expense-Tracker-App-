import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createSession, publicUser } from '@/lib/auth';
import { LoginInputSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const parsed = LoginInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Enter a valid email address and password' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return NextResponse.json({ success: false, error: 'Incorrect email address or password' }, { status: 401 });
    const response = NextResponse.json({ success: true, data: publicUser(user) });
    await createSession(user.id, response);
    return response;
  } catch (error) {
    console.error('Login failed', error);
    return NextResponse.json({ success: false, error: 'Unable to sign in. Please try again.' }, { status: 500 });
  }
}
