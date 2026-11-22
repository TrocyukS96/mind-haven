import { AscentRuleError } from '@/shared/lib/ascent/errors';
import { decodeHabitWeekdays, decodeWeeklyQuota } from '@/shared/lib/habit/habit-weekdays';

/** MVP links a habit that is due every calendar day. Weekday subsets and weekly quotas stay out. */
export function assertDailyHabitFrequency(frequency: string): void {
  if (decodeWeeklyQuota(frequency)) throw new AscentRuleError('habit_not_daily');

  const days = decodeHabitWeekdays(frequency);
  if (days && days.length < 7) throw new AscentRuleError('habit_not_daily');
}

export function isCompatibleDailyHabit(frequency: string): boolean {
  try {
    assertDailyHabitFrequency(frequency);
    return true;
  } catch (error) {
    if (error instanceof AscentRuleError && error.code === 'habit_not_daily') return false;
    throw error;
  }
}
