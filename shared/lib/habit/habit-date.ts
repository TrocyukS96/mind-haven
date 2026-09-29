export function formatHabitDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getHabitToday(): string {
  return formatHabitDate(new Date());
}

export function shiftHabitDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatHabitDate(date);
}

export type HabitRange = 'week' | 'month' | 'year';

export function getHabitWeekDates(today = getHabitToday()): string[] {
  const weekday = parseHabitDate(today).getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = shiftHabitDate(today, -daysFromMonday);
  return Array.from({ length: 7 }, (_, index) => shiftHabitDate(monday, index));
}

export function mondayOffset(dateStr: string): number {
  const weekday = parseHabitDate(dateStr).getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = shiftHabitDate(cursor, 1);
  }
  return dates;
}

export function getHabitMonthDates(today = getHabitToday()): string[] {
  const parsed = parseHabitDate(today);
  const start = formatHabitDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  const end = formatHabitDate(new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0));
  return datesBetween(start, end);
}

export function getHabitYearDates(today = getHabitToday()): string[] {
  const year = parseHabitDate(today).getFullYear();
  return datesBetween(`${year}-01-01`, `${year}-12-31`);
}

export function getHabitRangeDates(range: HabitRange, today = getHabitToday()): string[] {
  if (range === 'month') return getHabitMonthDates(today);
  if (range === 'year') return getHabitYearDates(today);
  return getHabitWeekDates(today);
}

export function parseHabitDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function calculateHabitStreak(
  completedDays: string[],
  today = getHabitToday(),
  isScheduled: (date: string) => boolean = () => true
): number {
  const completed = new Set(completedDays);

  const previousScheduled = (date: string): string | null => {
    let cursor = shiftHabitDate(date, -1);
    for (let index = 0; index < 400; index += 1) {
      if (isScheduled(cursor)) return cursor;
      cursor = shiftHabitDate(cursor, -1);
    }
    return null;
  };

  let cursor: string | null = isScheduled(today) ? today : previousScheduled(today);

  if (cursor === today && cursor != null && !completed.has(cursor)) {
    cursor = previousScheduled(cursor);
  }

  if (!cursor || !completed.has(cursor)) {
    return 0;
  }

  let streak = 0;
  while (cursor && completed.has(cursor)) {
    streak += 1;
    cursor = previousScheduled(cursor);
  }

  return streak;
}
