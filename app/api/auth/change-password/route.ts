import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser, createSession } from '@/lib/auth';
import { ChangePasswordSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid password details' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // Check if user has an existing passwordHash
    if (user.passwordHash) {
      const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from your current password' },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
    await createSession(updatedUser, response);
    return response;
  } catch (error) {
    console.error('Change password failed', error);
    return NextResponse.json(
      { success: false, error: 'Unable to update password. Please try again.' },
      { status: 500 }
    );
  }
}
