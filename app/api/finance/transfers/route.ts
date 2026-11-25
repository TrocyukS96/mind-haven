import type { TransferInput } from '@/shared/lib/finance/capital-ledger';
import { createFinanceTransfer } from '@/shared/lib/finance/finance-service';
import { isUserId, jsonError, requireUserId } from '../route-helpers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!isUserId(userId)) return userId;

  try {
    const body = (await request.json()) as TransferInput;
    const result = await createFinanceTransfer(userId, body);
    return NextResponse.json({ transfer: result.value, books: result.books, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return jsonError(error, 'Failed to create transfer');
  }
}
