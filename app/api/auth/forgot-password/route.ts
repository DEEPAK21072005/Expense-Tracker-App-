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
    const body = await request.json();
    const parsed = ForgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Enter a valid email address' }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const allUsers = await prisma.user.findMany();
      user = allUsers.find((u) => u.email.toLowerCase() === email) || null;
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'No account found with this email address. Please check your spelling or create an account.',
        },
        { status: 404 }
      );
    }

    // Generate a cryptographically secure reset token
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

    // Build the reset URL reliably using host header or origin
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
    const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '') || 'http';
    const origin = `${proto}://${host}`;
    const resetUrl = `${origin}/reset-password?token=${token}`;

    return NextResponse.json({
      success: true,
      message: 'Password reset link generated successfully.',
      resetUrl,
      token,
      expiresAt: expiry.toISOString(),
    });
  } catch (error) {
    console.error('Forgot password failed', error);
    return NextResponse.json({ success: false, error: 'Unable to process request. Please try again.' }, { status: 500 });
  }
}
