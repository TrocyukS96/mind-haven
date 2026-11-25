import { auth } from '@/shared/lib/auth/auth';
import { financeErrorStatus } from '@/shared/lib/finance/finance-books-store';
import { NextResponse } from 'next/server';

export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session.user.id;
}

export function isUserId(value: string | NextResponse): value is string {
  return typeof value === 'string';
}

export function jsonError(error: unknown, fallback: string) {
  const mapped = financeErrorStatus(error);
  return NextResponse.json(
    { error: mapped.error || fallback },
    { status: mapped.status }
  );
}
