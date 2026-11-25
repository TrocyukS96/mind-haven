import { archiveFinanceAccount } from '@/shared/lib/finance/finance-service';
import { isUserId, jsonError, requireUserId } from '../../../route-helpers';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!isUserId(userId)) return userId;
  const { id } = await context.params;

  try {
    const result = await archiveFinanceAccount(userId, id);
    return NextResponse.json({ account: result.value, books: result.books });
  } catch (error) {
    return jsonError(error, 'Failed to archive account');
  }
}
