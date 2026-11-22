import { ASCENT_LIMITS } from '@/entities/ascent/model/types';
import { AscentRuleError } from '@/shared/lib/ascent/errors';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function assertTimeZone(timeZone: string): string {
  const value = timeZone.trim();
  if (!value) throw new AscentRuleError('invalid_timezone');

  try {
    Intl.DateTimeFormat('en-US', { timeZone: value });
  } catch {
    throw new AscentRuleError('invalid_timezone');
  }

  return value;
}

export function assertIsoDate(value: string): string {
  const match = ISO_DATE.exec(value);
  if (!match) throw new AscentRuleError('invalid_local_date');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new AscentRuleError('invalid_local_date');
  }

  return value;
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const value = assertIsoDate(isoDate);
  if (!Number.isInteger(days)) throw new AscentRuleError('invalid_local_date');

  const [year, month, day] = value.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = utc.getUTCFullYear();
  const nextMonth = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(utc.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function eachLocalDate(start: string, endInclusive: string): string[] {
  const from = assertIsoDate(start);
  const to = assertIsoDate(endInclusive);
  if (from > to) return [];

  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    const next = shiftIsoDate(cursor, 1);
    if (next <= cursor) throw new AscentRuleError('invalid_local_date');
    cursor = next;
    if (dates.length > 4000) throw new AscentRuleError('invalid_local_date');
  }

  return dates;
}

function zonedParts(instant: Date, timeZone: string): { year: string; month: string; day: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  let year = read('year');
  let month = read('month');
  let day = read('day');
  const hour = Number(read('hour'));

  // Some engines report midnight as 24:00 on the previous calendar date.
  if (hour === 24) {
    const shifted = shiftIsoDate(`${year}-${month}-${day}`, 1);
    [year, month, day] = shifted.split('-');
  }

  return { year, month, day };
}

/** Calendar date of an instant in the challenge timezone, independent of the server timezone. */
export function formatLocalDate(instant: Date, timeZone: string): string {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new AscentRuleError('invalid_local_date');
  }

  const zone = assertTimeZone(timeZone);
  const parts = zonedParts(instant, zone);
  return assertIsoDate(`${parts.year}-${parts.month}-${parts.day}`);
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClock(instant: Date, timeZone: string): WallClock {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  let year = Number(read('year'));
  let month = Number(read('month'));
  let day = Number(read('day'));
  let hour = Number(read('hour'));

  if (hour === 24) {
    const shifted = shiftIsoDate(`${read('year')}-${read('month')}-${read('day')}`, 1);
    [year, month, day] = shifted.split('-').map(Number);
    hour = 0;
  }

  return {
    year,
    month,
    day,
    hour,
    minute: Number(read('minute')),
    second: Number(read('second')),
  };
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const wall = wallClock(instant, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - instant.getTime();
}

const LOCAL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `HH:mm` of an instant in the challenge timezone. */
export function formatLocalTime(instant: Date, timeZone: string): string {
  formatLocalDate(instant, timeZone);
  const wall = wallClock(instant, assertTimeZone(timeZone));
  return `${String(wall.hour).padStart(2, '0')}:${String(wall.minute).padStart(2, '0')}`;
}

/** An instant whose wall clock in `timeZone` is `isoDate` at `HH:mm`. */
export function localDateTime(isoDate: string, time: string, timeZone: string): Date {
  const date = assertIsoDate(isoDate);
  const match = LOCAL_TIME.exec(time);
  if (!match) throw new AscentRuleError('invalid_local_date');
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const zone = assertTimeZone(timeZone);
  const [year, month, day] = date.split('-').map(Number);
  const wallUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utc = wallUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const next = wallUtc - zoneOffsetMs(new Date(utc), zone);
    if (next === utc) break;
    utc = next;
  }

  const result = new Date(utc);
  const wall = wallClock(result, zone);
  if (formatLocalDate(result, zone) !== date || wall.hour !== hour || wall.minute !== minute || wall.second !== 0) {
    throw new AscentRuleError('invalid_local_date');
  }

  return result;
}

/**
 * Wall-clock abstinence start. It may be earlier than the challenge start.
 * It cannot be in the future, and it cannot be used to invent closed days.
 */
export function resolveAbstinenceStartedAt(input: {
  now: Date;
  timeZone: string;
  date: string;
  time: string;
}): Date {
  if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
    throw new AscentRuleError('invalid_local_date');
  }
  const instant = localDateTime(input.date, input.time, input.timeZone);
  if (instant.getTime() > input.now.getTime()) throw new AscentRuleError('abstinence_start_in_future');
  const earliest = input.now.getTime() - ASCENT_LIMITS.targetDaysMax * 86_400_000;
  if (instant.getTime() < earliest) throw new AscentRuleError('abstinence_start_invalid');
  return instant;
}

/** 00:00:00 on `isoDate` in `timeZone`. */
export function startOfLocalDay(isoDate: string, timeZone: string): Date {
  const date = assertIsoDate(isoDate);
  const zone = assertTimeZone(timeZone);
  const [year, month, day] = date.split('-').map(Number);
  const wallUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let utc = wallUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const next = wallUtc - zoneOffsetMs(new Date(utc), zone);
    if (next === utc) break;
    utc = next;
  }

  const result = new Date(utc);
  const wall = wallClock(result, zone);
  if (formatLocalDate(result, zone) !== date || wall.hour !== 0 || wall.minute !== 0 || wall.second !== 0) {
    throw new AscentRuleError('invalid_local_date');
  }

  return result;
}

export function assertTimezoneUnchanged(current: string, next: string): void {
  if (assertTimeZone(current) !== assertTimeZone(next)) {
    throw new AscentRuleError('timezone_locked');
  }
}

/** An instant whose calendar date in `timeZone` is `isoDate`. */
export function instantOnLocalDate(isoDate: string, timeZone: string): Date {
  const date = assertIsoDate(isoDate);
  const zone = assertTimeZone(timeZone);
  const [year, month, day] = date.split('-').map(Number);

  for (let offset = -1; offset <= 1; offset += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const instant = new Date(Date.UTC(year, month - 1, day + offset, hour, 30, 0));
      if (formatLocalDate(instant, zone) === date) return instant;
    }
  }

  throw new AscentRuleError('invalid_local_date');
}

/**
 * Today starts at `now`, so settlement cannot close earlier dates.
 * A future local date stays after `now`. A past date is rejected.
 */
export function resolveChallengeStartsAt(
  now: Date,
  timeZone: string,
  startDate: string | null | undefined
): Date {
  const zone = assertTimeZone(timeZone);
  if (startDate == null || startDate === '') return now;
  if (typeof startDate !== 'string') throw new AscentRuleError('invalid_local_date');

  const requested = assertIsoDate(startDate);
  const today = formatLocalDate(now, zone);
  if (requested < today) throw new AscentRuleError('start_date_in_past');
  if (requested === today) return now;

  const latest = shiftIsoDate(today, ASCENT_LIMITS.targetDaysMax);
  if (requested > latest) throw new AscentRuleError('invalid_local_date');

  const instant = startOfLocalDay(requested, zone);
  if (instant.getTime() <= now.getTime()) throw new AscentRuleError('start_date_in_past');
  return instant;
}
