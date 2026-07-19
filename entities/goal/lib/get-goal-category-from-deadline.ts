import { differenceInCalendarDays, startOfDay } from 'date-fns';
import type { GoalCategory } from '../model/types';

export type GoalTimeCategory = Exclude<GoalCategory, 'all'>;

export function getGoalCategoryFromDeadline(deadline: string | Date): GoalTimeCategory {
  const deadlineDate = startOfDay(typeof deadline === 'string' ? new Date(deadline) : deadline);
  const today = startOfDay(new Date());
  const daysUntil = differenceInCalendarDays(deadlineDate, today);

  if (daysUntil <= 7) return 'week';
  if (daysUntil <= 31) return 'month';
  return 'year';
}
