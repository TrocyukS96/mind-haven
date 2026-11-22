import { ASCENT_LIMITS, type XpActivityRule, type XpMutation, type AscentState } from '@/entities/ascent/model/types';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import { ascentKey, assertClientIdempotencyKey } from '@/shared/lib/ascent/keys';
import { assertIsoDate } from '@/shared/lib/ascent/local-date';
import { assertAscentInvariants, copyAscentState, hasAppliedKey, withAppliedKey } from '@/shared/lib/ascent/state';

function scaleQuantity(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > ASCENT_LIMITS.quantityMax) {
    throw new AscentRuleError('invalid_quantity');
  }

  const scaled = Math.round(value * 1000);
  if (!Number.isSafeInteger(scaled) || Math.abs(value * 1000 - scaled) > 1e-6) {
    throw new AscentRuleError('invalid_quantity');
  }

  return scaled;
}

export function assertActivityRule(rule: XpActivityRule): void {
  if (!Number.isSafeInteger(rule.xpPerGrant) || rule.xpPerGrant < 1 || rule.xpPerGrant > ASCENT_LIMITS.xpPerGrantMax) {
    throw new AscentRuleError('invalid_activity_rule');
  }

  const perGrant = scaleQuantity(rule.quantityPerGrant);
  const minimum = scaleQuantity(rule.minQuantity);
  if (perGrant <= 0 || minimum < 0) {
    throw new AscentRuleError('invalid_activity_rule');
  }
}

/**
 * Proportional XP, rounded down.
 * 100 push-ups = 40 XP pays 20 XP for 50 push-ups when the minimum allows it.
 * 3 km = 70 XP pays 35 XP for 1.5 km and 140 XP for 6 km.
 * A completion unit pays its XP once.
 */
export function xpForQuantity(rule: XpActivityRule, quantity: number): number {
  assertActivityRule(rule);
  if (!rule.active) return 0;

  const amount = scaleQuantity(quantity);
  const minimum = scaleQuantity(rule.minQuantity);
  if (amount <= 0 || amount < minimum) return 0;

  if (rule.unit === 'completion') return rule.xpPerGrant;

  const perGrant = scaleQuantity(rule.quantityPerGrant);
  const product = amount * rule.xpPerGrant;
  if (!Number.isSafeInteger(product)) throw new AscentRuleError('xp_grant_too_large');

  const xp = Math.floor(product / perGrant);
  if (xp > ASCENT_LIMITS.singleGrantMax) throw new AscentRuleError('xp_grant_too_large');

  return xp;
}

export function assertActivityDateOpen(
  localDate: string,
  today: string,
  settledDates: readonly string[]
): void {
  const date = assertIsoDate(localDate);
  const current = assertIsoDate(today);
  if (date > current) throw new AscentRuleError('future_date');
  if (date < current || settledDates.includes(date)) {
    throw new AscentRuleError('day_already_closed');
  }
}

export interface ActivityGrantResult {
  state: AscentState;
  mutation: XpMutation | null;
  xp: number;
  replayed: boolean;
}

export function registerActivity(input: {
  state: AscentState;
  challengeId: string;
  today: string;
  settledDates: readonly string[];
  localDate: string;
  rule: XpActivityRule;
  quantity: number;
  idempotencyKey: string;
  sourceId?: string | null;
}): ActivityGrantResult {
  assertAscentInvariants(input.state);
  const requestKey = assertClientIdempotencyKey(input.idempotencyKey);
  const key = ascentKey(input.challengeId, `activity:${requestKey}`);

  if (hasAppliedKey(input.state, key)) {
    return { state: copyAscentState(input.state), mutation: null, xp: 0, replayed: true };
  }

  assertActivityDateOpen(input.localDate, input.today, input.settledDates);

  if (!input.rule.active) throw new AscentRuleError('activity_inactive');
  const xp = xpForQuantity(input.rule, input.quantity);
  if (xp <= 0) throw new AscentRuleError('below_minimum');

  const xpBalance = input.state.xpBalance + xp;
  const xpEarnedTotal = input.state.xpEarnedTotal + xp;
  const state = withAppliedKey(
    { ...input.state, xpBalance, xpEarnedTotal },
    key
  );
  assertAscentInvariants(state);

  return {
    state,
    xp,
    replayed: false,
    mutation: {
      idempotencyKey: key,
      amount: xp,
      lifetimeDelta: xp,
      reason: 'activity_grant',
      balanceAfter: xpBalance,
      earnedTotalAfter: xpEarnedTotal,
      localDate: input.localDate,
      sourceId: input.sourceId ?? null,
    },
  };
}

export interface PurchaseResult {
  state: AscentState;
  mutation: XpMutation | null;
  xpSpent: number;
  replayed: boolean;
}

export function purchaseReward(input: {
  state: AscentState;
  challengeId: string;
  xpCost: number;
  active: boolean;
  available: boolean;
  localDate: string;
  today: string;
  settledDates: readonly string[];
  idempotencyKey: string;
  sourceId?: string | null;
}): PurchaseResult {
  assertAscentInvariants(input.state);
  const requestKey = assertClientIdempotencyKey(input.idempotencyKey);
  const key = ascentKey(input.challengeId, `purchase:${requestKey}`);

  if (hasAppliedKey(input.state, key)) {
    return { state: copyAscentState(input.state), mutation: null, xpSpent: 0, replayed: true };
  }

  assertActivityDateOpen(input.localDate, input.today, input.settledDates);

  if (!input.active || !input.available) throw new AscentRuleError('reward_unavailable');
  if (!Number.isSafeInteger(input.xpCost) || input.xpCost < 0) {
    throw new AscentRuleError('invalid_xp_cost');
  }
  if (input.state.xpBalance < input.xpCost) throw new AscentRuleError('insufficient_xp');

  const xpBalance = input.state.xpBalance - input.xpCost;
  const state = withAppliedKey({ ...input.state, xpBalance }, key);
  assertAscentInvariants(state);

  return {
    state,
    xpSpent: input.xpCost,
    replayed: false,
    mutation:
      input.xpCost === 0
        ? null
        : {
            idempotencyKey: key,
            amount: -input.xpCost,
            lifetimeDelta: 0,
            reason: 'reward_purchase',
            balanceAfter: xpBalance,
            earnedTotalAfter: state.xpEarnedTotal,
            localDate: input.localDate,
            sourceId: input.sourceId ?? null,
          },
  };
}

export interface ReversalResult {
  state: AscentState;
  mutation: XpMutation | null;
  balanceDebit: number;
  replayed: boolean;
}

export function reverseActivityXp(input: {
  state: AscentState;
  challengeId: string;
  logId: string;
  xpGranted: number;
  localDate: string;
  alreadyReversed: boolean;
}): ReversalResult {
  assertAscentInvariants(input.state);
  assertIsoDate(input.localDate);
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(input.logId)) {
    throw new AscentRuleError('invalid_idempotency_key');
  }
  if (!Number.isSafeInteger(input.xpGranted) || input.xpGranted < 0) {
    throw new AscentRuleError('invalid_quantity');
  }

  const key = ascentKey(input.challengeId, `reversal:${input.logId}`);
  if (input.alreadyReversed || hasAppliedKey(input.state, key)) {
    return { state: copyAscentState(input.state), mutation: null, balanceDebit: 0, replayed: true };
  }

  const balanceDebit = Math.min(input.state.xpBalance, input.xpGranted);
  const xpBalance = input.state.xpBalance - balanceDebit;
  const xpEarnedTotal = Math.max(0, input.state.xpEarnedTotal - input.xpGranted);
  const state = withAppliedKey({ ...input.state, xpBalance, xpEarnedTotal }, key);
  assertAscentInvariants(state);
  const lifetimeDelta = xpEarnedTotal - input.state.xpEarnedTotal;

  return {
    state,
    balanceDebit,
    replayed: false,
    mutation:
      balanceDebit === 0 && lifetimeDelta === 0
        ? null
        : {
            idempotencyKey: key,
            amount: -balanceDebit,
            lifetimeDelta,
            reason: 'activity_reversal',
            balanceAfter: xpBalance,
            earnedTotalAfter: xpEarnedTotal,
            localDate: input.localDate,
            sourceId: input.logId,
          },
  };
}

export function wipeBalanceForReset(
  state: AscentState,
  challengeId: string,
  localDate: string
): { state: AscentState; mutation: XpMutation | null } {
  if (state.xpBalance === 0) return { state, mutation: null };

  const key = ascentKey(challengeId, `reset:${localDate}`);
  if (hasAppliedKey(state, key)) return { state, mutation: null };

  const amount = -state.xpBalance;
  const next = withAppliedKey({ ...state, xpBalance: 0 }, key);
  return {
    state: next,
    mutation: {
      idempotencyKey: key,
      amount,
      lifetimeDelta: 0,
      reason: 'streak_reset',
      balanceAfter: 0,
      earnedTotalAfter: next.xpEarnedTotal,
      localDate,
      sourceId: null,
    },
  };
}
