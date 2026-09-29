import { formatHabitDate, parseHabitDate, shiftHabitDate } from '@/shared/lib/habit/habit-date';

export type HabitPeriod = 'day' | 'week' | 'month' | 'year';

const WEEKLY_FREQUENCIES = new Set([
  'weekly',
  'еженедельно',
  '3 раза в неделю',
  '5 раз в неделю',
  '3 times a week',
  '5 times a week',
  'threeperweek',
  'fiveperweek',
]);

const MONTHLY_FREQUENCIES = new Set(['monthly', 'ежемесячно']);

const YEARLY_FREQUENCIES = new Set(['yearly', 'ежегодно', 'annually']);

export function resolveHabitPeriod(frequency: string | null | undefined): HabitPeriod {
  const normalized = frequency?.trim().toLowerCase() ?? '';
  if (WEEKLY_FREQUENCIES.has(normalized)) return 'week';
  if (MONTHLY_FREQUENCIES.has(normalized)) return 'month';
  if (YEARLY_FREQUENCIES.has(normalized)) return 'year';
  return 'day';
}

export function getHabitPeriodBounds(date: string, period: HabitPeriod): { start: string; end: string } {
  if (period === 'day') {
    return { start: date, end: date };
  }

  if (period === 'week') {
    const parsed = parseHabitDate(date);
    const weekday = parsed.getDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    const start = shiftHabitDate(date, -daysFromMonday);
    return { start, end: shiftHabitDate(start, 6) };
  }

  const parsed = parseHabitDate(date);
  if (period === 'month') {
    const start = formatHabitDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    const end = formatHabitDate(new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0));
    return { start, end };
  }

  const year = parsed.getFullYear();
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function sumHabitPeriodCounts(
  dayCounts: Record<string, number>,
  date: string,
  period: HabitPeriod
): number {
  const { start, end } = getHabitPeriodBounds(date, period);
  return Object.entries(dayCounts).reduce((sum, [day, count]) => {
    if (day >= start && day <= end) return sum + count;
    return sum;
  }, 0);
}

export function lastLoggedDateInPeriod(
  dayCounts: Record<string, number>,
  date: string,
  period: HabitPeriod,
  today: string
): string | null {
  const { start, end } = getHabitPeriodBounds(date, period);
  const cap = end < today ? end : today;
  let last: string | null = null;

  for (const [day, count] of Object.entries(dayCounts)) {
    if (count <= 0 || day < start || day > cap) continue;
    if (last == null || day > last) last = day;
  }

  return last;
}
