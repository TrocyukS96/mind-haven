import { differenceInCalendarDays, isValid, startOfDay } from 'date-fns';
import { GoalStatus } from '@/entities/goal/model/types';

/** Low progress counts as a slip only inside this window, or after the deadline. */
const AT_RISK_LEAD_DAYS = 30;

export function getGoalStatus(
  progress: number,
  deadline?: string | Date | null,
  now: Date = new Date()
): GoalStatus {
  const value = Number.isFinite(progress) ? Math.max(0, progress) : 0;
  if (value >= 100) return 'completed';

  const daysLeft = daysUntilDeadline(deadline, now);

  if (daysLeft !== null && daysLeft < 0) return 'at-risk';

  if (value <= 0) {
    if (daysLeft !== null && daysLeft <= AT_RISK_LEAD_DAYS) return 'at-risk';
    return 'not-started';
  }

  if (daysLeft !== null && daysLeft > AT_RISK_LEAD_DAYS) return 'on-track';
  if (value >= 60) return 'on-track';
  return 'at-risk';
}

function daysUntilDeadline(
  deadline: string | Date | null | undefined,
  now: Date
): number | null {
  if (!deadline) return null;
  const date = deadline instanceof Date ? deadline : new Date(deadline);
  if (!isValid(date)) return null;
  return differenceInCalendarDays(startOfDay(date), startOfDay(now));
}
