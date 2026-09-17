import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { CategoryInputSchema } from '@/lib/validation';

function unauthorized() { return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 }); }

export async function GET() {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const categories = await prisma.category.findMany({ where: { userId: user.id }, orderBy: [{ type: 'asc' }, { name: 'asc' }], include: { _count: { select: { transactions: true } } } });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) { console.error('Categories query failed', error); return NextResponse.json({ success: false, error: 'Unable to load categories' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return unauthorized();
  try {
    const parsed = CategoryInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid category' }, { status: 400 });
    const category = await prisma.category.create({ data: { userId: user.id, ...parsed.data } });
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return NextResponse.json({ success: false, error: 'A category with this name already exists' }, { status: 409 });
    console.error('Category creation failed', error); return NextResponse.json({ success: false, error: 'Unable to create this category' }, { status: 500 });
  }
}
