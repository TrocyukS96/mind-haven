import { auth } from '@/shared/lib/auth/auth';
import {
  createFinanceAccount,
  getFinanceAccounts,
} from '@/shared/lib/finance/finance-service';
import type { FinanceAccountInput } from '@/entities/finance/model/types';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accounts = await getFinanceAccounts(session.user.id);
    return NextResponse.json({ accounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load accounts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as FinanceAccountInput;

  try {
    const account = await createFinanceAccount(session.user.id, body);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create account';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
