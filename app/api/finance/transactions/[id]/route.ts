import { auth } from '@/shared/lib/auth/auth';
import {
  deleteFinanceTransaction,
  updateFinanceTransaction,
} from '@/shared/lib/finance/finance-service';
import type { FinanceTransactionInput } from '@/entities/finance/model/types';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as FinanceTransactionInput;

  try {
    const transaction = await updateFinanceTransaction(session.user.id, id, body);
    return NextResponse.json({ transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update transaction';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await deleteFinanceTransaction(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete transaction';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
