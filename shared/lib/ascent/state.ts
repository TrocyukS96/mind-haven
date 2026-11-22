import type { AscentState } from '@/entities/ascent/model/types';
import { AscentRuleError } from '@/shared/lib/ascent/errors';

export function copyAscentState(state: AscentState): AscentState {
  return {
    ...state,
    appliedKeys: [...state.appliedKeys],
  };
}

export function hasAppliedKey(state: AscentState, key: string): boolean {
  return state.appliedKeys.includes(key);
}

export function withAppliedKey(state: AscentState, key: string): AscentState {
  if (state.appliedKeys.includes(key)) return copyAscentState(state);
  return {
    ...state,
    appliedKeys: [...state.appliedKeys, key],
  };
}

export function assertAscentInvariants(state: AscentState): void {
  const integers = [state.currentStreak, state.bestStreak, state.xpBalance, state.xpEarnedTotal];
  if (integers.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new AscentRuleError('invariant_broken');
  }

  if (state.bestStreak < state.currentStreak || state.xpEarnedTotal < state.xpBalance) {
    throw new AscentRuleError('invariant_broken');
  }

  if (state.status === 'paused' && state.pauseStartedOn == null) {
    throw new AscentRuleError('invalid_pause');
  }

  if (state.status !== 'paused' && state.pauseStartedOn != null) {
    throw new AscentRuleError('invalid_pause');
  }
}
