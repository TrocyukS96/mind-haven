import { parseHabitDate } from '@/shared/lib/habit/habit-date';

export const HABIT_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const HABIT_WEEKDAY_MESSAGE_KEY = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
  0: 'sun',
} as const;

const WEEKDAY_PREFIX = 'days:';
const WEEKLY_QUOTA_PREFIX = 'week:';

const WEEKLY_QUOTA_ALIASES: Record<string, number> = {
  '2 times a week': 2,
  '2 per week': 2,
  'twice a week': 2,
  'twiceperweek': 2,
  '2 раза в неделю': 2,
  'два раза в неделю': 2,
  '3 times a week': 3,
  '3 per week': 3,
  'threeperweek': 3,
  '3 раза в неделю': 3,
  'три раза в неделю': 3,
};

export function encodeWeeklyQuota(times: number): string {
  if (!Number.isInteger(times) || times < 1 || times > 7) {
    throw new Error('Weekly quota must be between 1 and 7');
  }

  return `${WEEKLY_QUOTA_PREFIX}${times}`;
}

export function decodeWeeklyQuota(frequency: string | null | undefined): number | null {
  const normalized = frequency?.trim().toLowerCase() ?? '';
  if (!normalized) return null;

  if (normalized.startsWith(WEEKLY_QUOTA_PREFIX)) {
    const times = Number(normalized.slice(WEEKLY_QUOTA_PREFIX.length));
    if (Number.isInteger(times) && times >= 1 && times <= 7) return times;
    return null;
  }

  return WEEKLY_QUOTA_ALIASES[normalized] ?? null;
}

export function encodeHabitWeekdays(days: number[]): string {
  const selected = new Set(
    days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
  const ordered = HABIT_WEEKDAY_ORDER.filter((day) => selected.has(day));

  if (ordered.length === 0) {
    throw new Error('Select at least one weekday');
  }

  return `${WEEKDAY_PREFIX}${ordered.join(',')}`;
}

export function decodeHabitWeekdays(frequency: string | null | undefined): number[] | null {
  const normalized = frequency?.trim().toLowerCase() ?? '';
  if (!normalized.startsWith(WEEKDAY_PREFIX)) return null;

  const parts = normalized.slice(WEEKDAY_PREFIX.length).split(',').filter(Boolean);
  if (parts.length === 0) return null;

  const days = parts.map((part) => Number(part));
  if (days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return null;

  const selected = new Set(days);
  return HABIT_WEEKDAY_ORDER.filter((day) => selected.has(day));
}

export function normalizeStoredHabitFrequency(frequency: string): string {
  const trimmed = frequency.trim();
  const quota = decodeWeeklyQuota(trimmed);
  if (quota != null) {
    return encodeWeeklyQuota(quota);
  }

  if (!trimmed.toLowerCase().startsWith(WEEKDAY_PREFIX)) return trimmed;

  const days = decodeHabitWeekdays(trimmed);
  if (!days) {
    throw new Error('Select at least one weekday');
  }

  return encodeHabitWeekdays(days);
}

export function isHabitScheduledOn(frequency: string | null | undefined, date: string): boolean {
  if (decodeWeeklyQuota(frequency)) return true;

  const days = decodeHabitWeekdays(frequency);
  if (!days) return true;
  return days.includes(parseHabitDate(date).getDay());
}

export function formatHabitWeekdayFrequency(
  frequency: string,
  labelFor: (day: number) => string
): string {
  const days = decodeHabitWeekdays(frequency);
  if (!days) return frequency;
  return days.map((day) => labelFor(day)).join(', ');
}
