import type { Habit } from '@/entities/habit/model/types';
import type { HabitObligationInput } from '@/shared/lib/ascent/day-result';
import { isHabitDayMet } from '@/shared/lib/habit/habit-progress';
import { isHabitScheduledOn } from '@/shared/lib/habit/habit-weekdays';

/**
 * Reads an existing Mind Haven habit. Completion is `isHabitDayMet`;
 * the challenge does not keep a second copy of habit progress.
 * A habit that is not scheduled on this date does not fail the day.
 */
export function habitObligationForDate(
  habit: Pick<Habit, 'frequency' | 'targetCount' | 'completedDays' | 'dayCounts'> & {
    id: string;
    name: string;
  },
  date: string,
  options: { required: boolean; sortOrder: number }
): HabitObligationInput {
  const scheduled = isHabitScheduledOn(habit.frequency, date);
  const met = scheduled && isHabitDayMet(habit, date);

  return {
    id: habit.id,
    title: habit.name,
    required: options.required,
    scheduled,
    met,
    sortOrder: options.sortOrder,
  };
}
