import { NextResponse } from 'next/server';
import { deleteCurrentSession } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  await deleteCurrentSession(response);
  return response;
}
