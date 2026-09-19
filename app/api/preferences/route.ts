import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, publicUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { SUPPORTED_CURRENCIES } from '@/lib/money';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
  return NextResponse.json({ success: true, data: publicUser(user) });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
  try {
    const body = await request.json();
    const data: { name?: string; baseCurrency?: string; timezone?: string; theme?: string } = {};
    if (typeof body.name === 'string' && body.name.trim().length >= 2 && body.name.trim().length <= 80) data.name = body.name.trim();
    if (typeof body.baseCurrency === 'string' && body.baseCurrency in SUPPORTED_CURRENCIES) data.baseCurrency = body.baseCurrency;
    if (typeof body.timezone === 'string' && body.timezone.length <= 100) data.timezone = body.timezone;
    if (body.theme === 'light' || body.theme === 'dark' || body.theme === 'system') data.theme = body.theme;
    const updated = await prisma.user.update({ where: { id: user.id }, data });
    return NextResponse.json({ success: true, data: publicUser(updated) });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to save preferences' }, { status: 500 });
  }
}
