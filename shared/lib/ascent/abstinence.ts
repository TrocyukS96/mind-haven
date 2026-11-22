import type { ChallengeStatus } from '@/entities/ascent/model/types';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import {
  assertTimeZone,
  formatLocalDate,
  resolveAbstinenceStartedAt,
  shiftIsoDate,
  startOfLocalDay,
} from '@/shared/lib/ascent/local-date';

/**
 * Clock for the current uninterrupted abstinence period.
 * `running.startedAt` is not the original challenge start after a failed day,
 * and it is not derived from the count of successful days.
 * Today can advance the clock before the server closes it and increments the streak.
 */
export interface AscentClock {
  mode: 'countdown' | 'running' | 'broken' | 'frozen';
  /** ISO instant. Null before the start and after a violation on the still-open day. */
  startedAt: string | null;
  /**
   * Countdown: challenge start.
   * Running and broken: next local midnight, when the client should reload.
   * Frozen: end of the last successful local day.
   */
  boundaryAt: string | null;
}

function latestDate(dates: readonly string[]): string | null {
  return dates.reduce<string | null>((latest, date) => (latest == null || date > latest ? date : latest), null);
}

function periodStart(origin: Date, timeZone: string, failedLocalDates: readonly string[]): Date {
  const latestFailure = latestDate(failedLocalDates);
  if (!latestFailure) return origin;
  const next = startOfLocalDay(shiftIsoDate(latestFailure, 1), timeZone);
  return next.getTime() > origin.getTime() ? next : origin;
}

export function optionalAbstinenceStart(input: {
  now: Date;
  timeZone: string;
  fallback: Date;
  date: unknown;
  time: unknown;
  mentioned: boolean;
}): Date {
  if (!input.mentioned) return input.fallback;
  if (typeof input.date !== 'string' || typeof input.time !== 'string') {
    throw new AscentRuleError('abstinence_start_invalid');
  }
  return resolveAbstinenceStartedAt({
    now: input.now,
    timeZone: input.timeZone,
    date: input.date,
    time: input.time,
  });
}

/** The clock origin can be corrected only before the first reset or recorded violation. */
export function canEditAbstinenceStart(input: {
  status: string;
  currentStreak: number;
  bestStreak: number;
  hasFailedDay: boolean;
  hasStreakReset: boolean;
  openViolation: boolean;
}): boolean {
  if (input.status !== 'active') return false;
  if (input.hasFailedDay || input.hasStreakReset || input.openViolation) return false;
  if (input.bestStreak > input.currentStreak) return false;
  return true;
}

export function buildAbstinenceClock(input: {
  startsAt: Date;
  /** Clock origin. Defaults to the challenge start so older callers stay unchanged. */
  abstinenceStartedAt?: Date;
  timezone: string;
  status: ChallengeStatus | string;
  now: Date;
  failedLocalDates: readonly string[];
  successfulLocalDates: readonly string[];
  openDayFailed: boolean;
}): AscentClock {
  if (!(input.startsAt instanceof Date) || Number.isNaN(input.startsAt.getTime())) {
    throw new AscentRuleError('invalid_local_date');
  }
  const origin = input.abstinenceStartedAt ?? input.startsAt;
  if (!(origin instanceof Date) || Number.isNaN(origin.getTime())) {
    throw new AscentRuleError('invalid_local_date');
  }
  if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
    throw new AscentRuleError('invalid_local_date');
  }

  const zone = assertTimeZone(input.timezone);
  if (input.now.getTime() < input.startsAt.getTime()) {
    return { mode: 'countdown', startedAt: null, boundaryAt: input.startsAt.toISOString() };
  }

  const today = formatLocalDate(input.now, zone);
  const nextMidnight = startOfLocalDay(shiftIsoDate(today, 1), zone);
  const started = periodStart(origin, zone, input.failedLocalDates);

  if (input.status === 'completed' || input.status === 'archived') {
    const lastSuccess = latestDate(input.successfulLocalDates);
    const ended = lastSuccess ? startOfLocalDay(shiftIsoDate(lastSuccess, 1), zone) : started;
    return { mode: 'frozen', startedAt: started.toISOString(), boundaryAt: ended.toISOString() };
  }

  if (input.status === 'active' && input.openDayFailed) {
    return { mode: 'broken', startedAt: null, boundaryAt: nextMidnight.toISOString() };
  }

  if (started.getTime() > input.now.getTime()) {
    return { mode: 'broken', startedAt: null, boundaryAt: started.toISOString() };
  }

  return { mode: 'running', startedAt: started.toISOString(), boundaryAt: nextMidnight.toISOString() };
}
