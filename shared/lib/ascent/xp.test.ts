import { describe, expect, it } from 'vitest';
import type { AscentState, XpActivityRule } from '@/entities/ascent/model/types';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import { purchaseReward, registerActivity, reverseActivityXp, xpForQuantity } from '@/shared/lib/ascent/xp';

const CHALLENGE = 'challenge1';
const TODAY = '2026-11-22';

function state(partial: Partial<AscentState> = {}): AscentState {
  return {
    status: 'active',
    currentStreak: 0,
    bestStreak: 0,
    xpBalance: 0,
    xpEarnedTotal: 0,
    pauseStartedOn: null,
    appliedKeys: [],
    ...partial,
  };
}

const run: XpActivityRule = {
  unit: 'kilometers',
  xpPerGrant: 70,
  quantityPerGrant: 3,
  minQuantity: 1,
  active: true,
};

describe('XP quantities', () => {
  it('pays a run in proportion to the distance', () => {
    expect(xpForQuantity(run, 0.5)).toBe(0);
    expect(xpForQuantity(run, 1.5)).toBe(35);
    expect(xpForQuantity(run, 3)).toBe(70);
    expect(xpForQuantity(run, 4.5)).toBe(105);
    expect(xpForQuantity(run, 6)).toBe(140);
  });

  it('pays partial repetitions and keeps a completion as a single grant', () => {
    const pushups: XpActivityRule = {
      unit: 'repetitions',
      xpPerGrant: 40,
      quantityPerGrant: 100,
      minQuantity: 1,
      active: true,
    };
    const strictPushups: XpActivityRule = { ...pushups, minQuantity: 100 };
    const english: XpActivityRule = {
      unit: 'minutes',
      xpPerGrant: 45,
      quantityPerGrant: 30,
      minQuantity: 30,
      active: true,
    };
    const cleaning: XpActivityRule = {
      unit: 'completion',
      xpPerGrant: 50,
      quantityPerGrant: 1,
      minQuantity: 1,
      active: true,
    };

    expect(xpForQuantity(pushups, 100)).toBe(40);
    expect(xpForQuantity(pushups, 250)).toBe(100);
    expect(xpForQuantity(pushups, 50)).toBe(20);
    expect(xpForQuantity(strictPushups, 50)).toBe(0);
    expect(xpForQuantity(english, 30)).toBe(45);
    expect(xpForQuantity(english, 45)).toBe(67);
    expect(xpForQuantity(cleaning, 1)).toBe(50);
    expect(xpForQuantity(cleaning, 3)).toBe(50);
  });
});

describe('XP ledger', () => {
  it('grants a run once and rejects a second charge of the same key', () => {
    const first = registerActivity({
      state: state(),
      challengeId: CHALLENGE,
      today: TODAY,
      settledDates: [],
      localDate: TODAY,
      rule: run,
      quantity: 6,
      idempotencyKey: 'run-00001',
    });

    expect(first.xp).toBe(140);
    expect(first.state.xpBalance).toBe(140);
    expect(first.state.xpEarnedTotal).toBe(140);

    const replay = registerActivity({
      state: first.state,
      challengeId: CHALLENGE,
      today: '2026-11-23',
      settledDates: [TODAY],
      localDate: TODAY,
      rule: run,
      quantity: 6,
      idempotencyKey: 'run-00001',
    });

    expect(replay.replayed).toBe(true);
    expect(replay.state.xpBalance).toBe(140);
    expect(replay.mutation).toBeNull();
  });

  it('buys a reward once and leaves the balance unchanged when XP is short', () => {
    const funded = state({ xpBalance: 100, xpEarnedTotal: 100, currentStreak: 2, bestStreak: 2 });
    const snapshot = structuredClone(funded);
    const bought = purchaseReward({
      state: funded,
      challengeId: CHALLENGE,
      xpCost: 30,
      active: true,
      available: true,
      localDate: TODAY,
      today: TODAY,
      settledDates: [],
      idempotencyKey: 'buy-0001',
    });

    expect(bought.xpSpent).toBe(30);
    expect(bought.state.xpBalance).toBe(70);
    expect(bought.state.xpEarnedTotal).toBe(100);
    expect(bought.mutation?.amount).toBe(-30);
    expect(bought.mutation?.lifetimeDelta).toBe(0);

    const replay = purchaseReward({
      state: bought.state,
      challengeId: CHALLENGE,
      xpCost: 30,
      active: true,
      available: true,
      localDate: TODAY,
      today: TODAY,
      settledDates: [],
      idempotencyKey: 'buy-0001',
    });
    expect(replay.replayed).toBe(true);
    expect(replay.state.xpBalance).toBe(70);

    expect(() =>
      purchaseReward({
        state: bought.state,
        challengeId: CHALLENGE,
        xpCost: 80,
        active: true,
        available: true,
        localDate: TODAY,
        today: TODAY,
        settledDates: [],
        idempotencyKey: 'buy-0002',
      })
    ).toThrow(AscentRuleError);
    expect(bought.state.xpBalance).toBe(70);
    expect(funded).toEqual(snapshot);
  });

  it('does not log XP for a closed or future day, or below the minimum', () => {
    const base = {
      state: state(),
      challengeId: CHALLENGE,
      today: TODAY,
      settledDates: [] as string[],
      rule: run,
      idempotencyKey: 'run-00002',
    };

    expect(() => registerActivity({ ...base, localDate: '2026-11-23', quantity: 3 })).toThrow(AscentRuleError);
    expect(() => registerActivity({ ...base, localDate: '2026-11-21', quantity: 3 })).toThrow(AscentRuleError);
    expect(() => registerActivity({ ...base, localDate: TODAY, quantity: 0.5 })).toThrow(AscentRuleError);
  });

  it('reverses a mistaken grant without taking the balance below zero', () => {
    const granted = registerActivity({
      state: state(),
      challengeId: CHALLENGE,
      today: TODAY,
      settledDates: [],
      localDate: TODAY,
      rule: run,
      quantity: 3,
      idempotencyKey: 'run-00003',
    });
    const spent = purchaseReward({
      state: granted.state,
      challengeId: CHALLENGE,
      xpCost: 50,
      active: true,
      available: true,
      localDate: TODAY,
      today: TODAY,
      settledDates: [],
      idempotencyKey: 'buy-0003',
    });
    const reversed = reverseActivityXp({
      state: spent.state,
      challengeId: CHALLENGE,
      logId: 'log000003',
      xpGranted: 70,
      localDate: TODAY,
      alreadyReversed: false,
    });

    expect(spent.state.xpBalance).toBe(20);
    expect(reversed.balanceDebit).toBe(20);
    expect(reversed.state.xpBalance).toBe(0);
    expect(reversed.state.xpEarnedTotal).toBe(0);
    expect(reversed.state.currentStreak).toBe(0);

    const again = reverseActivityXp({
      state: reversed.state,
      challengeId: CHALLENGE,
      logId: 'log000003',
      xpGranted: 70,
      localDate: TODAY,
      alreadyReversed: false,
    });
    expect(again.replayed).toBe(true);
    expect(again.state).toEqual(reversed.state);
  });
});
