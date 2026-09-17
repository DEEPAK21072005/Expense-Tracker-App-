import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { createSession, publicUser } from '@/lib/auth';

const ResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(10, 'Use at least 10 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Include a letter')
    .regex(/\d/, 'Include a number'),
});

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const parsed = ResetSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash new password and clear the reset token
    const passwordHash = await bcrypt.hash(password, 12);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    // Create a fresh session (old sessions are automatically invalidated because
    // they are HMAC-signed stateless tokens — no session table to purge)
    const response = NextResponse.json({ success: true, data: publicUser(updatedUser) });
    await createSession(user.id, response);
    return response;
  } catch (error) {
    console.error('Reset password failed', error);
    return NextResponse.json(
      { success: false, error: 'Unable to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
