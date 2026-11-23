import type { AscentState, DayFailureReason } from '@/entities/ascent/model/types';
import type { DebtItemResult, DayEvaluation } from '@/shared/lib/ascent/day-result';
import { missedDayEvaluation } from '@/shared/lib/ascent/day-result';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import { ascentKey } from '@/shared/lib/ascent/keys';
import { assertIsoDate, eachLocalDate, formatLocalDate, shiftIsoDate } from '@/shared/lib/ascent/local-date';
import { assertAscentInvariants, copyAscentState, hasAppliedKey, withAppliedKey } from '@/shared/lib/ascent/state';
import { wipeBalanceForReset } from '@/shared/lib/ascent/xp';
import type { XpMutation } from '@/entities/ascent/model/types';

export interface PauseWindow {
  /** Exclusive start: the local date pause was requested. That date is still judged. */
  afterLocalDate: string;
  /** Exclusive end: the local date the challenge resumed. */
  beforeLocalDate: string;
}

export interface SettledDay {
  localDate: string;
  status: 'successful' | 'failed' | 'skipped';
  debtClosed: boolean;
  obligationsMet: boolean;
  failureReason: DayFailureReason | null;
  streakAtStart: number;
  streakAfter: number;
  bestStreakAfter: number;
  xpBalanceAfter: number;
  items: readonly DebtItemResult[];
}

export interface SettlementResult {
  state: AscentState;
  days: SettledDay[];
  xpMutations: XpMutation[];
  completed: boolean;
}

function latestDate(dates: readonly string[]): string | null {
  return dates.reduce<string | null>((latest, date) => {
    const value = assertIsoDate(date);
    if (latest == null || value > latest) return value;
    return latest;
  }, null);
}

function isInsidePauseWindow(localDate: string, windows: readonly PauseWindow[]): boolean {
  return windows.some((window) => {
    const after = assertIsoDate(window.afterLocalDate);
    const before = assertIsoDate(window.beforeLocalDate);
    if (after >= before) throw new AscentRuleError('invalid_pause');
    return localDate > after && localDate < before;
  });
}

function isSkippedDate(localDate: string, state: AscentState, windows: readonly PauseWindow[]): boolean {
  if (state.status === 'paused') {
    if (!state.pauseStartedOn) throw new AscentRuleError('invalid_pause');
    if (localDate > state.pauseStartedOn) return true;
  }

  return isInsidePauseWindow(localDate, windows);
}

function assertEvaluation(evaluation: DayEvaluation): void {
  if (evaluation.status === 'pending') throw new AscentRuleError('pending_day_cannot_settle');

  if (evaluation.status === 'successful') {
    if (!evaluation.debtClosed || !evaluation.obligationsMet || evaluation.failureReason) {
      throw new AscentRuleError('inconsistent_day');
    }
    return;
  }

  if (!evaluation.failureReason || evaluation.debtClosed || evaluation.obligationsMet) {
    throw new AscentRuleError('inconsistent_day');
  }
}

function evaluationFor(
  evaluate: ((localDate: string, streakAtStart: number) => DayEvaluation) | undefined,
  localDate: string,
  streakAtStart: number
): DayEvaluation {
  if (!evaluate) return missedDayEvaluation();
  const evaluation = evaluate(localDate, streakAtStart);
  assertEvaluation(evaluation);
  return evaluation;
}

function settledDay(
  localDate: string,
  status: SettledDay['status'],
  evaluation: DayEvaluation | null,
  streakAtStart: number,
  state: AscentState
): SettledDay {
  return {
    localDate,
    status,
    debtClosed: status === 'skipped' ? true : (evaluation?.debtClosed ?? false),
    obligationsMet: status === 'skipped' ? true : (evaluation?.obligationsMet ?? false),
    failureReason: status === 'skipped' ? null : (evaluation?.failureReason ?? 'obligations_unmet'),
    streakAtStart,
    streakAfter: state.currentStreak,
    bestStreakAfter: state.bestStreak,
    xpBalanceAfter: state.xpBalance,
    items: evaluation?.items ?? [],
  };
}

const DECLARED_ABSTINENCE: DayEvaluation = {
  status: 'successful',
  debtClosed: true,
  obligationsMet: true,
  failureReason: null,
  items: [],
};

/**
 * Closes every local date from the day after the latest settled date through yesterday.
 * Today stays open, so the result does not depend on a browser tab staying open.
 * A date without an evaluate callback fails and, when the balance is positive, zeroes XP once.
 * Dates already settled are ignored, so the same date cannot reset or increment twice.
 * The personal record is only raised, never lowered.
 * After the streak reaches `targetDays` the challenge completes and later dates are left untouched.
 * `creditBefore` marks declared abstinence: those local dates close successfully without debt.
 * Missing credited dates that sit before an already settled day are closed first, in order.
 */
export function settleElapsedDays(input: {
  state: AscentState;
  challengeId: string;
  timezone: string;
  startsOn: string;
  targetDays: number;
  now: Date;
  settledDates: readonly string[];
  pauseWindows?: readonly PauseWindow[];
  /** Local dates strictly before this one are declared abstinence, not challenge debt. */
  creditBefore?: string;
  evaluate?: (localDate: string, streakAtStart: number) => DayEvaluation;
}): SettlementResult {
  assertAscentInvariants(input.state);
  if (!Number.isSafeInteger(input.targetDays) || input.targetDays < 1) {
    throw new AscentRuleError('invalid_target_days');
  }

  const startsOn = assertIsoDate(input.startsOn);
  const today = formatLocalDate(input.now, input.timezone);
  const yesterday = shiftIsoDate(today, -1);
  const windows = input.pauseWindows ?? [];
  let state = copyAscentState(input.state);

  if (state.status === 'completed' || state.status === 'archived') {
    return { state, days: [], xpMutations: [], completed: state.status === 'completed' };
  }

  const latest = latestDate(input.settledDates);
  let cursor = latest ? shiftIsoDate(latest, 1) : startsOn;
  if (cursor < startsOn) cursor = startsOn;
  const creditEnd = input.creditBefore ? shiftIsoDate(assertIsoDate(input.creditBefore), -1) : null;

  const days: SettledDay[] = [];
  const xpMutations: XpMutation[] = [];

  const alreadyClosed = (localDate: string) =>
    hasAppliedKey(state, ascentKey(input.challengeId, `day:${localDate}`)) || input.settledDates.includes(localDate);

  const recordSuccess = (localDate: string, evaluation: DayEvaluation): boolean => {
    const dayKey = ascentKey(input.challengeId, `day:${localDate}`);
    const streakAtStart = state.currentStreak;
    const currentStreak = state.currentStreak + 1;
    const bestStreak = Math.max(state.bestStreak, currentStreak);
    state = withAppliedKey({ ...state, currentStreak, bestStreak }, dayKey);
    days.push(settledDay(localDate, 'successful', evaluation, streakAtStart, state));
    if (currentStreak >= input.targetDays) {
      state = { ...state, status: 'completed', pauseStartedOn: null };
      return true;
    }
    return false;
  };

  if (creditEnd && creditEnd >= startsOn) {
    const beforeForward = shiftIsoDate(cursor, -1);
    const end = beforeForward < creditEnd ? beforeForward : creditEnd;
    if (end >= startsOn) {
      for (const localDate of eachLocalDate(startsOn, end)) {
        if (localDate > yesterday || alreadyClosed(localDate)) continue;
        if (recordSuccess(localDate, DECLARED_ABSTINENCE)) {
          assertAscentInvariants(state);
          return { state, days, xpMutations, completed: true };
        }
      }
    }
  }

  if (cursor > yesterday) {
    assertAscentInvariants(state);
    return { state, days, xpMutations, completed: false };
  }

  for (const localDate of eachLocalDate(cursor, yesterday)) {
    const dayKey = ascentKey(input.challengeId, `day:${localDate}`);
    if (alreadyClosed(localDate)) continue;

    const streakAtStart = state.currentStreak;

    if (creditEnd && localDate <= creditEnd) {
      if (recordSuccess(localDate, DECLARED_ABSTINENCE)) {
        assertAscentInvariants(state);
        return { state, days, xpMutations, completed: true };
      }
      continue;
    }

    if (isSkippedDate(localDate, state, windows)) {
      state = withAppliedKey(state, dayKey);
      days.push(settledDay(localDate, 'skipped', null, streakAtStart, state));
      continue;
    }

    const evaluation = evaluationFor(input.evaluate, localDate, streakAtStart);
    if (evaluation.status === 'successful') {
      if (recordSuccess(localDate, evaluation)) {
        assertAscentInvariants(state);
        return { state, days, xpMutations, completed: true };
      }
      continue;
    }

    const wiped = wipeBalanceForReset(state, input.challengeId, localDate);
    state = withAppliedKey({ ...wiped.state, currentStreak: 0 }, dayKey);
    if (wiped.mutation) xpMutations.push(wiped.mutation);
    days.push(settledDay(localDate, 'failed', evaluation, streakAtStart, state));
  }

  assertAscentInvariants(state);
  return { state, days, xpMutations, completed: false };
}

export function pauseChallenge(state: AscentState, pauseOn: string): AscentState {
  assertAscentInvariants(state);
  const pauseStartedOn = assertIsoDate(pauseOn);
  if (state.status !== 'active') throw new AscentRuleError('challenge_not_active');

  const next = { ...copyAscentState(state), status: 'paused' as const, pauseStartedOn };
  assertAscentInvariants(next);
  return next;
}

export function resumeChallenge(
  state: AscentState,
  resumeOn: string
): { state: AscentState; pauseWindow: PauseWindow | null } {
  assertAscentInvariants(state);
  const beforeLocalDate = assertIsoDate(resumeOn);
  if (state.status !== 'paused' || !state.pauseStartedOn) {
    throw new AscentRuleError('challenge_not_paused');
  }
  if (beforeLocalDate < state.pauseStartedOn) throw new AscentRuleError('invalid_pause');

  const pauseWindow =
    shiftIsoDate(state.pauseStartedOn, 1) < beforeLocalDate
      ? { afterLocalDate: state.pauseStartedOn, beforeLocalDate }
      : null;

  const next = { ...copyAscentState(state), status: 'active' as const, pauseStartedOn: null };
  assertAscentInvariants(next);
  return { state: next, pauseWindow };
}
