import type { Habit } from '@/entities/habit/model/types';
import { resolveHabitTrackingType } from '@/entities/habit/model/tracking-type';
import { calculateHabitStreak, getHabitToday } from '@/shared/lib/habit/habit-date';
import {
  getHabitPeriodBounds,
  lastLoggedDateInPeriod,
  resolveHabitPeriod,
  sumHabitPeriodCounts,
} from '@/shared/lib/habit/habit-period';
import { isHabitScheduledOn } from '@/shared/lib/habit/habit-weekdays';

export const HABIT_COUNT_MAX = 1_000_000;

export type HabitCountTone = 'empty' | 'under' | 'exact' | 'over';

export function getHabitCountTone(count: number, target: number): HabitCountTone {
  if (count <= 0) return 'empty';
  if (count === target) return 'exact';
  if (count > target) return 'over';
  return 'under';
}

export function normalizeTargetCount(value: unknown): number | null {
  if (value == null || value === '') return null;

  const count = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(count) || count < 1 || count > HABIT_COUNT_MAX) {
    throw new Error('Invalid target count');
  }

  return count;
}

export function normalizeDayCount(value: unknown): number {
  const count = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(count) || count < 0 || count > HABIT_COUNT_MAX) {
    throw new Error('Invalid count');
  }

  return count;
}

export function parseDayCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const result: Record<string, number> = {};
  for (const [date, count] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0 || count > HABIT_COUNT_MAX) {
      continue;
    }
    result[date] = count;
  }

  return result;
}

export function ensureHabitShape(habit: Habit): Habit {
  const targetCount =
    typeof habit.targetCount === 'number' &&
    Number.isInteger(habit.targetCount) &&
    habit.targetCount > 0 &&
    habit.targetCount <= HABIT_COUNT_MAX
      ? habit.targetCount
      : null;

  return {
    ...habit,
    completedDays: Array.isArray(habit.completedDays)
      ? habit.completedDays.filter((day) => typeof day === 'string')
      : [],
    trackingType: resolveHabitTrackingType({
      trackingType: habit.trackingType,
      targetCount,
    }),
    targetCount,
    dayCounts: parseDayCounts(habit.dayCounts),
  };
}

export function applyDayCount(
  dayCounts: Record<string, number>,
  date: string,
  count: number
): Record<string, number> {
  const next = { ...dayCounts };
  if (count <= 0) {
    delete next[date];
    return next;
  }

  next[date] = count;
  return next;
}

export interface HabitCountPresentation {
  value: number;
  showTarget: boolean;
  tone: HabitCountTone;
}

export function getHabitCountPresentation(
  habit: Pick<Habit, 'frequency' | 'targetCount' | 'dayCounts'>,
  date: string,
  today: string
): HabitCountPresentation | null {
  if (habit.targetCount == null) return null;

  const dayCount = habit.dayCounts[date] ?? 0;
  const period = resolveHabitPeriod(habit.frequency);

  if (period === 'day') {
    if (dayCount <= 0) return null;
    return {
      value: dayCount,
      showTarget: true,
      tone: getHabitCountTone(dayCount, habit.targetCount),
    };
  }

  const lastLoggedDate = lastLoggedDateInPeriod(habit.dayCounts, date, period, today);
  if (date === lastLoggedDate) {
    const total = sumHabitPeriodCounts(habit.dayCounts, date, period);
    return {
      value: total,
      showTarget: true,
      tone: getHabitCountTone(total, habit.targetCount),
    };
  }

  if (dayCount <= 0) return null;

  return {
    value: dayCount,
    showTarget: false,
    tone: 'under',
  };
}

export function completedDaysFromCounts(
  dayCounts: Record<string, number>,
  target: number,
  frequency = ''
): string[] {
  const period = resolveHabitPeriod(frequency);

  if (period === 'day') {
    return Object.entries(dayCounts)
      .filter(([, count]) => count >= target)
      .map(([date]) => date)
      .sort();
  }

  const metDates = new Set<string>();
  for (const date of Object.keys(dayCounts)) {
    if ((dayCounts[date] ?? 0) <= 0) continue;
    if (sumHabitPeriodCounts(dayCounts, date, period) < target) continue;

    const { start, end } = getHabitPeriodBounds(date, period);
    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > 0 && day >= start && day <= end) metDates.add(day);
    }
  }

  return [...metDates].sort();
}

export function isHabitDayMet(
  habit: Pick<Habit, 'targetCount' | 'completedDays' | 'dayCounts'> & { frequency?: string },
  date: string
): boolean {
  if (habit.targetCount == null) {
    return habit.completedDays.includes(date);
  }

  const period = resolveHabitPeriod(habit.frequency);
  if (period === 'day') {
    return (habit.dayCounts[date] ?? 0) >= habit.targetCount;
  }

  return sumHabitPeriodCounts(habit.dayCounts, date, period) >= habit.targetCount;
}

export function realignHabitProgress(
  habit: Pick<Habit, 'completedDays' | 'dayCounts' | 'targetCount'>,
  frequency: string,
  targetCount: number | null,
  today = getHabitToday()
): Pick<Habit, 'completedDays' | 'dayCounts' | 'streak'> {
  let dayCounts = habit.dayCounts;
  let completedDays = habit.completedDays;

  if (targetCount != null) {
    if (habit.targetCount == null) {
      dayCounts = { ...dayCounts };
      for (const date of habit.completedDays) {
        if ((dayCounts[date] ?? 0) <= 0) dayCounts[date] = targetCount;
      }
    }
    completedDays = completedDaysFromCounts(dayCounts, targetCount, frequency);
  }

  return {
    dayCounts,
    completedDays,
    streak: calculateHabitStreak(completedDays, today, (date) => isHabitScheduledOn(frequency, date)),
  };
}
