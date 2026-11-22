import { shiftIsoDate } from '@/shared/lib/ascent/local-date';
import type { AscentClock } from '@/shared/lib/ascent/abstinence';

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function durationParts(milliseconds: number): DurationParts {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

export function formatClockUnit(value: number): string {
  if (value >= 100) return String(value);
  return String(Math.max(0, value)).padStart(2, '0');
}

/** Visual elapsed time. The server clock decides the interval; this only renders it. */
export function clockMilliseconds(clock: AscentClock, now: number): number {
  if (clock.mode === 'broken') return 0;
  if (clock.mode === 'countdown') {
    return clock.boundaryAt ? new Date(clock.boundaryAt).getTime() - now : 0;
  }
  if (clock.mode === 'frozen') {
    if (!clock.startedAt || !clock.boundaryAt) return 0;
    return new Date(clock.boundaryAt).getTime() - new Date(clock.startedAt).getTime();
  }
  if (!clock.startedAt) return 0;
  return now - new Date(clock.startedAt).getTime();
}

export function summarizeDebt(items: readonly { required: boolean; state: string }[]): { total: number; done: number } {
  const required = items.filter((item) => item.required && item.state !== 'not_applicable');
  const done = required.filter((item) => item.state === 'satisfied' || item.state === 'bypassed').length;
  return { total: required.length, done };
}

export function isRestrictionLifted(
  restriction: { active: boolean; unlockAfterSuccessfulDays: number },
  currentStreak: number
): boolean {
  if (!restriction.active) return true;
  return restriction.unlockAfterSuccessfulDays > 0 && currentStreak >= restriction.unlockAfterSuccessfulDays;
}

export type ChallengeDayKind =
  | 'successful'
  | 'failed'
  | 'skipped'
  | 'current'
  | 'future'
  | 'before-start'
  | 'unsettled'
  | 'outside';

export interface ChallengeMonthCell {
  date: string | null;
  kind: ChallengeDayKind | 'pad';
}

function mondayIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

function firstOfNextMonth(monthStart: string): string {
  const [year, month] = monthStart.split('-').map(Number);
  if (month === 12) return `${year + 1}-01-01`;
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function buildChallengeMonth(input: {
  month: string;
  localDate: string;
  startsOn: string;
  challengeStatus: string;
  days: readonly { localDate: string; status: string }[];
}): ChallengeMonthCell[] {
  const first = `${input.month}-01`;
  const end = shiftIsoDate(firstOfNextMonth(first), -1);
  const settled = new Map(input.days.map((day) => [day.localDate, day.status]));
  const cells: ChallengeMonthCell[] = Array.from({ length: mondayIndex(first) }, () => ({
    date: null,
    kind: 'pad' as const,
  }));

  let cursor = first;
  while (cursor <= end) {
    const status = settled.get(cursor);
    let kind: ChallengeDayKind;
    if (cursor < input.startsOn) kind = 'before-start';
    else if (status === 'successful' || status === 'failed' || status === 'skipped') kind = status;
    else if (cursor > input.localDate) kind = 'future';
    else if (cursor === input.localDate && input.challengeStatus === 'active') kind = 'current';
    else if (input.challengeStatus === 'active' && cursor < input.localDate) kind = 'unsettled';
    else kind = 'outside';
    cells.push({ date: cursor, kind });
    cursor = shiftIsoDate(cursor, 1);
  }

  return cells;
}
