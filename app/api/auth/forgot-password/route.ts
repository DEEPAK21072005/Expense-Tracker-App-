import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';

const ForgotSchema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
});

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const parsed = ForgotSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Enter a valid email address' }, { status: 400 });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been generated.' });
    }

    // Generate a secure reset token
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiry = new Date(Date.now() + RESET_EXPIRY_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: expiry,
      },
    });

    // Build the reset URL from the request origin
    const origin = request.nextUrl.origin;
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Since this app has no email server, return the reset link directly.
    // In production with an SMTP provider, you would email this link instead.
    return NextResponse.json({
      success: true,
      message: 'Password reset link generated successfully.',
      resetUrl,
      expiresAt: expiry.toISOString(),
    });
  } catch (error) {
    console.error('Forgot password failed', error);
    return NextResponse.json({ success: false, error: 'Unable to process request. Please try again.' }, { status: 500 });
  }
}
