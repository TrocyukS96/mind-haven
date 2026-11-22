import { AscentRuleError } from '@/shared/lib/ascent/errors';

export function ascentKey(challengeId: string, suffix: string): string {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(challengeId)) {
    throw new AscentRuleError('invalid_challenge');
  }

  return `ascent:${challengeId}:${suffix}`;
}

export function assertClientIdempotencyKey(value: string): string {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(value)) {
    throw new AscentRuleError('invalid_idempotency_key');
  }

  return value;
}
