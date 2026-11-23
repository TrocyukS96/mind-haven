import { describe, expect, it } from 'vitest';
import type { AscentClock } from '@/shared/lib/ascent/abstinence';
import {
  buildChallengeMonth,
  clockMilliseconds,
  durationParts,
  formatClockUnit,
  isRestrictionLifted,
  summarizeDebt,
} from '@/features/ascent/model/dashboard';

describe('ascent dashboard presentation', () => {
  it('splits a running interval into days, hours, minutes, and seconds', () => {
    const clock: AscentClock = {
      mode: 'running',
      startedAt: '2026-11-20T10:00:00.000Z',
      boundaryAt: '2026-11-22T21:00:00.000Z',
    };
    const now = new Date('2026-11-22T12:14:32.800Z').getTime();
    expect(durationParts(clockMilliseconds(clock, now))).toEqual({
      days: 2,
      hours: 2,
      minutes: 14,
      seconds: 32,
    });
    expect(formatClockUnit(2)).toBe('02');
    expect(formatClockUnit(120)).toBe('120');
  });

  it('does not keep counting after a violation or before the start', () => {
    expect(
      clockMilliseconds({ mode: 'broken', startedAt: null, boundaryAt: '2026-11-22T21:00:00.000Z' }, Date.now())
    ).toBe(0);
    const countdown = clockMilliseconds(
      { mode: 'countdown', startedAt: null, boundaryAt: '2026-11-25T00:00:00.000Z' },
      new Date('2026-11-24T23:00:00.000Z').getTime()
    );
    expect(durationParts(countdown)).toEqual({ days: 0, hours: 1, minutes: 0, seconds: 0 });
  });

  it('counts progress from the open debt, not from lifted items', () => {
    expect(
      summarizeDebt([
        { required: true, state: 'satisfied' },
        { required: true, state: 'pending' },
        { required: true, state: 'not_applicable' },
        { required: false, state: 'pending' },
      ])
    ).toEqual({ total: 2, done: 1 });
  });

  it('lifts a restriction only after the streak reaches its threshold', () => {
    expect(isRestrictionLifted({ active: true, unlockAfterSuccessfulDays: 3 }, 2)).toBe(false);
    expect(isRestrictionLifted({ active: true, unlockAfterSuccessfulDays: 3 }, 3)).toBe(true);
    expect(isRestrictionLifted({ active: true, unlockAfterSuccessfulDays: 0 }, 30)).toBe(false);
    expect(isRestrictionLifted({ active: false, unlockAfterSuccessfulDays: 0 }, 0)).toBe(true);
  });

  it('marks settled, current, future, and pre-start days differently', () => {
    const cells = buildChallengeMonth({
      month: '2026-11',
      localDate: '2026-11-22',
      startsOn: '2026-11-20',
      challengeStatus: 'active',
      days: [
        { localDate: '2026-11-20', status: 'successful' },
        { localDate: '2026-11-21', status: 'failed' },
      ],
    });
    const byDate = new Map(cells.filter((cell) => cell.date).map((cell) => [cell.date, cell.kind]));
    expect(byDate.get('2026-11-19')).toBe('before-start');
    expect(byDate.get('2026-11-20')).toBe('successful');
    expect(byDate.get('2026-11-21')).toBe('failed');
    expect(byDate.get('2026-11-22')).toBe('current');
    expect(byDate.get('2026-11-23')).toBe('future');
    expect(cells.filter((cell) => cell.kind === 'successful')).toHaveLength(1);
  });

  it('keeps a declared abstinence day visible before the challenge start', () => {
    const cells = buildChallengeMonth({
      month: '2026-11',
      localDate: '2026-11-23',
      startsOn: '2026-11-23',
      challengeStatus: 'active',
      days: [{ localDate: '2026-11-22', status: 'successful' }],
    });
    const byDate = new Map(cells.filter((cell) => cell.date).map((cell) => [cell.date, cell.kind]));
    expect(byDate.get('2026-11-21')).toBe('before-start');
    expect(byDate.get('2026-11-22')).toBe('successful');
    expect(byDate.get('2026-11-23')).toBe('current');
  });

  it('does not paint days after a completed challenge as successful', () => {
    const cells = buildChallengeMonth({
      month: '2026-11',
      localDate: '2026-11-25',
      startsOn: '2026-11-20',
      challengeStatus: 'completed',
      days: [
        { localDate: '2026-11-20', status: 'successful' },
        { localDate: '2026-11-21', status: 'successful' },
      ],
    });
    const byDate = new Map(cells.filter((cell) => cell.date).map((cell) => [cell.date, cell.kind]));
    expect(byDate.get('2026-11-21')).toBe('successful');
    expect(byDate.get('2026-11-22')).toBe('outside');
    expect(byDate.get('2026-11-25')).toBe('outside');
  });
});
