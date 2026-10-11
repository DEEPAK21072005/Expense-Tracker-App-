import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createSession, DEFAULT_CATEGORIES, publicUser, syncVaultUserToDb, verifyPasswordResetToken } from '@/lib/auth';
import { ResetPasswordSchema } from '@/lib/validation';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request details' },
        { status: 400 }
      );
    }

    await syncVaultUserToDb();

    const { token, password } = parsed.data;
    const cleanToken = token.trim();
    const tokenHash = hashToken(cleanToken);

    let user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
      },
    });

    const verifiedSigned = verifyPasswordResetToken(cleanToken);

    if (user) {
      if (!user.passwordResetExpiry || new Date(user.passwordResetExpiry).getTime() < Date.now()) {
        return NextResponse.json(
          { success: false, error: 'This reset link is invalid or has expired. Please request a new one.' },
          { status: 400 }
        );
      }
    } else if (verifiedSigned) {
      // Serverless cold-start fallback: token is cryptographically verified and unexpired
      user = await prisma.user.findUnique({ where: { id: verifiedSigned.userId } });
      if (!user) {
        user = await prisma.user.findUnique({ where: { email: verifiedSigned.email.toLowerCase() } });
      }
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: verifiedSigned.userId,
            email: verifiedSigned.email.toLowerCase(),
            name: verifiedSigned.name,
            baseCurrency: verifiedSigned.baseCurrency,
            passwordHash: '',
            categories: {
              create: DEFAULT_CATEGORIES,
            },
            accounts: {
              create: [
                {
                  name: 'Primary Account',
                  type: 'BANK',
                  currency: verifiedSigned.baseCurrency,
                  balanceMinor: 0,
                },
              ],
            },
          },
        });
      }
    } else {
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

    // Create a fresh session with updatedUser (preserves email, name, baseCurrency, and new passwordHash)
    const response = NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
      data: publicUser(updatedUser),
    });
    await createSession(updatedUser, response);
    return response;
  } catch (error) {
    console.error('Reset password failed', error);
    return NextResponse.json(
      { success: false, error: 'Unable to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
