import { getFinanceBooks } from '@/shared/lib/finance/finance-service';
import { isUserId, jsonError, requireUserId } from '../route-helpers';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = await requireUserId();
  if (!isUserId(userId)) return userId;

  try {
    const books = await getFinanceBooks(userId);
    return NextResponse.json({ books });
  } catch (error) {
    return jsonError(error, 'Failed to load finance');
  }
}
