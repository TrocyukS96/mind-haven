import { PlannerApiError } from '@/entities/planner/api/planner-client';

export function taskColumnErrorText(
  error: unknown,
  t: (key: string) => string,
  fallbackKey: string
): string {
  const message = error instanceof Error ? error.message : '';
  const status = error instanceof PlannerApiError ? error.status : 0;
  if (status === 409 || message === 'WEEK_RANGE_OVERLAP' || /overlap/i.test(message)) {
    return t('columns.overlapError');
  }
  if (message === 'INVALID_RANGE' || (status === 400 && /range/i.test(message))) {
    return t('columns.invalidRange');
  }
  return t(fallbackKey);
}
