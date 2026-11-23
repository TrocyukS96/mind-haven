import { describe, expect, it } from 'vitest';
import type { AscentState } from '@/entities/ascent/model/types';
import { evaluateDay, type RestrictionObligationInput } from '@/shared/lib/ascent/day-result';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import {
  assertHasCoreRestriction,
  assertRewardBypassesRestriction,
  assertSingleActiveChallenge,
  coreBehaviorRestriction,
  useRewardPermission,
} from '@/shared/lib/ascent/rules';
import { pauseChallenge, resumeChallenge, settleElapsedDays } from '@/shared/lib/ascent/settlement';
import type { DayEvaluation } from '@/shared/lib/ascent/day-result';

const CHALLENGE = 'challenge1';
const ZONE = 'Europe/Minsk';

function blank(partial: Partial<AscentState> = {}): AscentState {
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

function core(partial: Partial<RestrictionObligationInput> = {}): RestrictionObligationInput {
  return {
    id: 'core',
    title: 'Smoking',
    kind: 'core_behavior',
    required: true,
    active: true,
    bypassable: false,
    unlockAfterSuccessfulDays: 0,
    honored: false,
    violated: false,
    bypassed: false,
    sortOrder: 0,
    ...partial,
  };
}

function kept(streakAtStart: number): DayEvaluation {
  return evaluateDay({
    streakAtStart,
    finalize: true,
    restrictions: [core({ honored: true })],
  });
}

function atMinsk(iso: string): Date {
  return new Date(iso);
}

describe('daily result', () => {
  it('keeps a fully met day pending until the calendar date ends', () => {
    const open = evaluateDay({
      streakAtStart: 1,
      finalize: false,
      restrictions: [core({ honored: true })],
    });
    expect(open.status).toBe('pending');
    expect(kept(1).status).toBe('successful');
  });

  it('fails an unconfirmed required debt and a core behavior even if a bypass was sent', () => {
    const unconfirmed = evaluateDay({
      streakAtStart: 0,
      finalize: true,
      restrictions: [core()],
    });
    expect(unconfirmed.status).toBe('failed');
    expect(unconfirmed.failureReason).toBe('restriction_unconfirmed');

    const boughtCore = evaluateDay({
      streakAtStart: 4,
      finalize: true,
      restrictions: [core({ bypassed: true })],
    });
    expect(boughtCore.status).toBe('failed');
  });

  it('treats a used bypass as permission, not as a violation', () => {
    const allowed = evaluateDay({
      streakAtStart: 5,
      finalize: true,
      restrictions: [
        core({ honored: true }),
        {
          id: 'late-meal',
          title: 'Late meal',
          kind: 'custom',
          required: true,
          active: true,
          bypassable: true,
          unlockAfterSuccessfulDays: 0,
          honored: false,
          violated: true,
          bypassed: true,
          sortOrder: 1,
        },
      ],
    });

    expect(allowed.status).toBe('successful');
    expect(allowed.items.find((item) => item.sourceId === 'late-meal')?.state).toBe('bypassed');
  });

  it('lifts a restriction after the successful-day threshold and does not carry yesterday into today', () => {
    const sweets = {
      id: 'sweets',
      title: 'Sweets',
      kind: 'custom' as const,
      required: true,
      active: true,
      bypassable: false,
      unlockAfterSuccessfulDays: 3,
      honored: false,
      violated: false,
      bypassed: false,
      sortOrder: 1,
    };
    const stillActive = evaluateDay({
      streakAtStart: 2,
      finalize: true,
      restrictions: [core({ honored: true }), sweets],
    });
    expect(stillActive.status).toBe('failed');

    const lifted = evaluateDay({
      streakAtStart: 3,
      finalize: true,
      restrictions: [core({ honored: true }), sweets],
    });
    expect(lifted.status).toBe('successful');
    expect(lifted.items.find((item) => item.sourceId === 'sweets')?.state).toBe('not_applicable');

    const permanent = evaluateDay({
      streakAtStart: 10,
      finalize: true,
      restrictions: [core({ honored: false, unlockAfterSuccessfulDays: 0 })],
    });
    expect(permanent.status).toBe('failed');

    const yesterday = evaluateDay({ streakAtStart: 0, finalize: true, restrictions: [core()] });
    const today = evaluateDay({
      streakAtStart: 0,
      finalize: true,
      restrictions: [core({ honored: true })],
    });
    expect(yesterday.status).toBe('failed');
    expect(today.status).toBe('successful');
    expect(today.items).toHaveLength(1);
  });

  it('fails the day immediately when the core behavior is already broken', () => {
    const broken = evaluateDay({
      streakAtStart: 6,
      finalize: false,
      restrictions: [core({ violated: true })],
    });
    expect(broken.status).toBe('failed');
    expect(broken.failureReason).toBe('restriction_violated');
  });
});

describe('streak settlement', () => {
  const base = {
    challengeId: CHALLENGE,
    timezone: ZONE,
    startsOn: '2026-11-20',
    targetDays: 30,
    settledDates: [] as string[],
  };

  it('adds one streak day and raises the record only after the local day ends', () => {
    const open = settleElapsedDays({
      ...base,
      state: blank(),
      now: atMinsk('2026-11-22T20:59:00.000Z'),
      evaluate: (_date, streak) => kept(streak),
    });
    expect(open.days.map((day) => day.localDate)).toEqual(['2026-11-20', '2026-11-21']);
    expect(open.state.currentStreak).toBe(2);
    expect(open.state.bestStreak).toBe(2);

    const boundary = settleElapsedDays({
      ...base,
      startsOn: '2026-11-22',
      state: blank(),
      now: atMinsk('2026-11-22T20:59:00.000Z'),
      evaluate: (_date, streak) => kept(streak),
    });
    expect(boundary.days).toEqual([]);
    expect(boundary.state.currentStreak).toBe(0);

    const closed = settleElapsedDays({
      ...base,
      startsOn: '2026-11-22',
      state: blank(),
      now: atMinsk('2026-11-22T21:00:00.000Z'),
      evaluate: (_date, streak) => kept(streak),
    });
    expect(closed.days.map((day) => day.status)).toEqual(['successful']);
    expect(closed.state.currentStreak).toBe(1);
    expect(closed.state.bestStreak).toBe(1);
  });

  it('counts local days before the challenge start as declared abstinence', () => {
    const result = settleElapsedDays({
      ...base,
      startsOn: '2026-11-21',
      creditBefore: '2026-11-22',
      state: blank(),
      now: atMinsk('2026-11-22T10:00:00.000Z'),
      evaluate: () => {
        throw new Error('debt must not be judged before the challenge starts');
      },
    });

    expect(result.days.map((day) => [day.localDate, day.status, day.items])).toEqual([
      ['2026-11-21', 'successful', []],
    ]);
    expect(result.state.currentStreak).toBe(1);
    expect(result.state.bestStreak).toBe(1);
    expect(result.completed).toBe(false);
  });

  it('inserts missing abstinence days ahead of an already closed challenge day', () => {
    const result = settleElapsedDays({
      ...base,
      startsOn: '2026-11-20',
      creditBefore: '2026-11-23',
      state: blank({ currentStreak: 1, bestStreak: 1 }),
      settledDates: ['2026-11-22'],
      now: atMinsk('2026-11-23T10:00:00.000Z'),
      evaluate: () => {
        throw new Error('the open day is not closed yet');
      },
    });

    expect(result.days.map((day) => day.localDate)).toEqual(['2026-11-20', '2026-11-21']);
    expect(result.days.every((day) => day.status === 'successful' && day.items.length === 0)).toBe(true);
    expect(result.state.currentStreak).toBe(3);
    expect(result.state.bestStreak).toBe(3);
  });

  it('resets a multi-day streak, keeps the record, and does not move old debt forward', () => {
    const result = settleElapsedDays({
      ...base,
      state: blank({ currentStreak: 0, bestStreak: 0 }),
      now: atMinsk('2026-11-24T10:00:00.000Z'),
      evaluate: (localDate, streak) => {
        if (localDate === '2026-11-23') {
          return evaluateDay({ streakAtStart: streak, finalize: true, restrictions: [core()] });
        }
        return kept(streak);
      },
    });

    expect(result.days.map((day) => day.status)).toEqual([
      'successful',
      'successful',
      'successful',
      'failed',
    ]);
    expect(result.state.currentStreak).toBe(0);
    expect(result.state.bestStreak).toBe(3);
    expect(result.days[3]?.failureReason).toBe('restriction_unconfirmed');
    expect(result.days[3]?.items).not.toEqual(result.days[2]?.items);
  });

  it('does not lower a record that is already higher than the current streak', () => {
    const result = settleElapsedDays({
      ...base,
      startsOn: '2026-11-22',
      state: blank({ currentStreak: 2, bestStreak: 5 }),
      now: atMinsk('2026-11-23T10:00:00.000Z'),
      evaluate: (_date, streak) => kept(streak),
    });

    expect(result.state.currentStreak).toBe(3);
    expect(result.state.bestStreak).toBe(5);

    const reset = settleElapsedDays({
      ...base,
      startsOn: '2026-11-23',
      state: result.state,
      settledDates: ['2026-11-22'],
      now: atMinsk('2026-11-24T10:00:00.000Z'),
    });
    expect(reset.state.currentStreak).toBe(0);
    expect(reset.state.bestStreak).toBe(5);
  });

  it('fails every missed day, wipes XP once, and ignores a second pass over those dates', () => {
    const initial = blank({ currentStreak: 4, bestStreak: 4, xpBalance: 80, xpEarnedTotal: 80 });
    const snapshot = structuredClone(initial);
    const first = settleElapsedDays({
      ...base,
      state: initial,
      now: atMinsk('2026-11-23T10:00:00.000Z'),
    });

    expect(first.days.map((day) => day.status)).toEqual(['failed', 'failed', 'failed']);
    expect(first.state.currentStreak).toBe(0);
    expect(first.state.bestStreak).toBe(4);
    expect(first.state.xpBalance).toBe(0);
    expect(first.state.xpEarnedTotal).toBe(80);
    expect(first.xpMutations).toHaveLength(1);
    expect(first.xpMutations[0]).toMatchObject({ amount: -80, reason: 'streak_reset', lifetimeDelta: 0 });
    expect(initial).toEqual(snapshot);

    const replay = settleElapsedDays({
      ...base,
      state: first.state,
      settledDates: first.days.map((day) => day.localDate),
      now: atMinsk('2026-11-23T10:00:00.000Z'),
      evaluate: (_date, streak) => kept(streak),
    });
    expect(replay.days).toEqual([]);
    expect(replay.xpMutations).toEqual([]);
    expect(replay.state.currentStreak).toBe(0);
    expect(replay.state.bestStreak).toBe(4);
    expect(replay.state.xpBalance).toBe(0);

    const replayByKey = settleElapsedDays({
      ...base,
      state: first.state,
      settledDates: [],
      now: atMinsk('2026-11-23T10:00:00.000Z'),
      evaluate: (_date, streak) => kept(streak),
    });
    expect(replayByKey.days).toEqual([]);
    expect(replayByKey.state.xpBalance).toBe(0);
  });

  it('zeroes a balance earned at streak zero when that day fails, and keeps lifetime XP', () => {
    const result = settleElapsedDays({
      ...base,
      startsOn: '2026-11-22',
      state: blank({ xpBalance: 70, xpEarnedTotal: 140, bestStreak: 3 }),
      now: atMinsk('2026-11-23T10:00:00.000Z'),
    });

    expect(result.state.currentStreak).toBe(0);
    expect(result.state.bestStreak).toBe(3);
    expect(result.state.xpBalance).toBe(0);
    expect(result.state.xpEarnedTotal).toBe(140);
    expect(result.xpMutations.map((entry) => entry.amount)).toEqual([-70]);
  });

  it('skips whole days inside a pause and still judges the day pause was requested', () => {
    const paused = pauseChallenge(
      blank({ currentStreak: 4, bestStreak: 4, xpBalance: 90, xpEarnedTotal: 90 }),
      '2026-11-10'
    );
    const resumed = resumeChallenge(paused, '2026-11-13');
    const result = settleElapsedDays({
      ...base,
      startsOn: '2026-11-10',
      state: resumed.state,
      pauseWindows: resumed.pauseWindow ? [resumed.pauseWindow] : [],
      now: atMinsk('2026-11-13T10:00:00.000Z'),
      evaluate: (localDate, streak) =>
        localDate === '2026-11-10' ? kept(streak) : evaluateDay({ streakAtStart: streak, finalize: true }),
    });

    expect(result.days.map((day) => [day.localDate, day.status])).toEqual([
      ['2026-11-10', 'successful'],
      ['2026-11-11', 'skipped'],
      ['2026-11-12', 'skipped'],
    ]);
    expect(result.state.currentStreak).toBe(5);
    expect(result.state.bestStreak).toBe(5);
    expect(result.state.xpBalance).toBe(90);
    expect(result.xpMutations).toEqual([]);
  });

  it('still fails the pause day when its debt was not kept', () => {
    const paused = pauseChallenge(blank({ currentStreak: 4, bestStreak: 6, xpBalance: 90, xpEarnedTotal: 90 }), '2026-11-10');
    const result = settleElapsedDays({
      ...base,
      startsOn: '2026-11-10',
      state: paused,
      now: atMinsk('2026-11-13T10:00:00.000Z'),
    });

    expect(result.days.map((day) => day.status)).toEqual(['failed', 'skipped', 'skipped']);
    expect(result.state.currentStreak).toBe(0);
    expect(result.state.bestStreak).toBe(6);
    expect(result.state.xpBalance).toBe(0);
    expect(result.xpMutations).toHaveLength(1);
  });

  it('completes on the target streak and does not fail the following offline days', () => {
    const result = settleElapsedDays({
      ...base,
      targetDays: 2,
      now: atMinsk('2026-11-24T10:00:00.000Z'),
      state: blank(),
      evaluate: (localDate, streak) => (localDate <= '2026-11-21' ? kept(streak) : evaluateDay({
        streakAtStart: streak,
        finalize: true,
        restrictions: [core()],
      })),
    });

    expect(result.completed).toBe(true);
    expect(result.days.map((day) => day.localDate)).toEqual(['2026-11-20', '2026-11-21']);
    expect(result.state.status).toBe('completed');
    expect(result.state.currentStreak).toBe(2);
    expect(result.state.bestStreak).toBe(2);

    const later = settleElapsedDays({
      ...base,
      state: result.state,
      settledDates: result.days.map((day) => day.localDate),
      now: atMinsk('2026-11-26T10:00:00.000Z'),
    });
    expect(later.days).toEqual([]);
    expect(later.state.currentStreak).toBe(2);
  });

  it('settles both calendar dates across the spring DST change', () => {
    const result = settleElapsedDays({
      ...base,
      timezone: 'Europe/Berlin',
      startsOn: '2026-03-28',
      state: blank(),
      now: atMinsk('2026-03-30T12:00:00.000Z'),
      evaluate: (_date, streak) => kept(streak),
    });

    expect(result.days.map((day) => day.localDate)).toEqual(['2026-03-28', '2026-03-29']);
    expect(result.state.currentStreak).toBe(2);
  });

  it('refuses a second active challenge and a bypass of the core behavior', () => {
    expect(() => assertSingleActiveChallenge(1)).toThrow(AscentRuleError);
    expect(() => assertSingleActiveChallenge(0)).not.toThrow();
    const coreDraft = coreBehaviorRestriction('Курение');
    expect(coreDraft.bypassable).toBe(false);
    expect(() => assertRewardBypassesRestriction(coreDraft, 'reward1')).toThrow(AscentRuleError);
    expect(() => assertHasCoreRestriction([])).toThrow(AscentRuleError);
    expect(() => assertHasCoreRestriction([coreDraft])).not.toThrow();

    const used = useRewardPermission(
      { grantsBypass: true, permissionUsed: false, usedOnLocalDate: null },
      '2026-11-22'
    );
    expect(used.permissionUsed).toBe(true);
    expect(useRewardPermission(used, '2026-11-22').replayed).toBe(true);
    expect(() => useRewardPermission(used, '2026-11-23')).toThrow(AscentRuleError);
  });
});
