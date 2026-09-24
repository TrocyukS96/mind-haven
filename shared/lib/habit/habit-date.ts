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

export function getHabitWeekDates(today = getHabitToday()): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftHabitDate(today, index - 6));
}

export function parseHabitDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function calculateHabitStreak(completedDays: string[], today = getHabitToday()): number {
  const completed = new Set(completedDays);
  let cursor = completed.has(today) ? today : shiftHabitDate(today, -1);

  if (!completed.has(cursor)) {
    return 0;
  }

  let streak = 0;
  while (completed.has(cursor)) {
    streak += 1;
    cursor = shiftHabitDate(cursor, -1);
  }

  return streak;
}
