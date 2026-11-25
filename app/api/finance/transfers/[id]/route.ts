import type { TransferInput } from '@/shared/lib/finance/capital-ledger';
import { deleteFinanceTransfer, updateFinanceTransfer } from '@/shared/lib/finance/finance-service';
import { isUserId, jsonError, requireUserId } from '../../route-helpers';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!isUserId(userId)) return userId;
  const { id } = await context.params;

  try {
    const body = (await request.json()) as TransferInput;
    const result = await updateFinanceTransfer(userId, id, body);
    return NextResponse.json({ transfer: result.value, books: result.books });
  } catch (error) {
    return jsonError(error, 'Failed to update transfer');
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!isUserId(userId)) return userId;
  const { id } = await context.params;

  try {
    const result = await deleteFinanceTransfer(userId, id);
    return NextResponse.json({ ok: true, books: result.books });
  } catch (error) {
    return jsonError(error, 'Failed to delete transfer');
  }
}
