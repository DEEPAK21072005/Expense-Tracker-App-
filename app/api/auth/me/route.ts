import { NextResponse } from 'next/server';
import { getCurrentUser, publicUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
  return NextResponse.json({ success: true, data: publicUser(user) });
}
