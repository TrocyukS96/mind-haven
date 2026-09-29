import { auth } from '@/shared/lib/auth/auth';
import { setDefaultFinanceAccount } from '@/shared/lib/finance/finance-service';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { accountId?: string | null };
    const accountId = body.accountId ?? null;

    if (accountId !== null && typeof accountId !== 'string') {
      return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
    }

    await setDefaultFinanceAccount(session.user.id, accountId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update default account';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
