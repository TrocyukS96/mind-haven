import { auth } from '@/shared/lib/auth/auth';
import { NextResponse } from 'next/server';

export async function requirePlannerUser(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export function plannerError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.endsWith('not found') ? 404 : message.includes('invalid') ? 400 : 500;
  return NextResponse.json({ error: message }, { status });
}
