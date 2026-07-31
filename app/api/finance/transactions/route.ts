import { auth } from '@/shared/lib/auth/auth';
import {
  createFinanceTransaction,
  getFinanceTransactions,
} from '@/shared/lib/finance/finance-service';
import type { FinanceTransactionInput } from '@/entities/finance/model/types';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const transactions = await getFinanceTransactions(session.user.id);
    return NextResponse.json({ transactions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as FinanceTransactionInput;

  try {
    const transaction = await createFinanceTransaction(session.user.id, body);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create transaction';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
