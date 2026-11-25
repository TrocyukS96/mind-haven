import type { AccountPurpose } from '@/entities/finance/model/types';
import { setFinanceAccountPurpose } from '@/shared/lib/finance/finance-service';
import { isUserId, jsonError, requireUserId } from '../../../route-helpers';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!isUserId(userId)) return userId;
  const { id } = await context.params;

  try {
    const body = (await request.json()) as { purpose: AccountPurpose; date: string };
    const result = await setFinanceAccountPurpose(userId, id, body.purpose, body.date);
    return NextResponse.json({ account: result.value, books: result.books });
  } catch (error) {
    return jsonError(error, 'Failed to change account purpose');
  }
}
