import type { FinanceAccountInput } from '@/entities/finance/model/types';
import { auth } from '@/shared/lib/auth/auth';
import {
  deleteFinanceAccount,
  updateFinanceAccount,
} from '@/shared/lib/finance/finance-service';
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

  try {
    const body = (await request.json()) as FinanceAccountInput;
    const result = await updateFinanceAccount(session.user.id, id, body);
    return NextResponse.json({ account: result.value, books: result.books });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update account';
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
    const result = await deleteFinanceAccount(session.user.id, id);
    return NextResponse.json({ ok: true, books: result.books });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
