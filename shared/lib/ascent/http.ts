import { isAscentRuleError, type AscentErrorCode } from '@/shared/lib/ascent/errors';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import { auth } from '@/shared/lib/auth/auth';
import { NextResponse } from 'next/server';

const STATUS: Partial<Record<AscentErrorCode, number>> = {
  not_found: 404,
  habit_owner_mismatch: 404,
  active_challenge_exists: 409,
  habit_already_linked: 409,
  permission_already_used: 409,
  day_already_closed: 409,
  challenge_not_active: 409,
  insufficient_xp: 409,
  reward_unavailable: 409,
  resource_in_use: 409,
  violation_locked: 409,
  abstinence_start_locked: 409,
};

export async function requireAscentUser(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function ascentError(error: unknown) {
  if (isAscentRuleError(error)) {
    const status = STATUS[error.code] ?? 400;
    const message = error.code === 'habit_owner_mismatch' || error.code === 'not_found' ? 'Not found' : error.message;
    return NextResponse.json({ error: message, code: error.code }, { status });
  }

  return NextResponse.json({ error: 'Ascent request failed' }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AscentRuleError('invalid_challenge');
  }
}

export async function handleAscent(action: (userId: string) => Promise<unknown>, status = 200) {
  const userId = await requireAscentUser();
  if (!userId) return unauthorized();

  try {
    return NextResponse.json(await action(userId), { status });
  } catch (error) {
    return ascentError(error);
  }
}

export function challengeQuery(request: Request): string | null {
  return new URL(request.url).searchParams.get('challengeId');
}
