export const HABIT_TRACKING_TYPES = ['check', 'count', 'minutes', 'pages', 'kilometers'] as const;

export type HabitTrackingType = (typeof HABIT_TRACKING_TYPES)[number];

export function normalizeHabitTrackingType(value: unknown): HabitTrackingType {
  if (typeof value === 'string' && HABIT_TRACKING_TYPES.includes(value as HabitTrackingType)) {
    return value as HabitTrackingType;
  }

  return 'check';
}

export function resolveHabitTrackingType(habit: {
  trackingType?: string | null;
  targetCount: number | null;
}): HabitTrackingType {
  const trackingType = normalizeHabitTrackingType(habit.trackingType);
  if (trackingType === 'check' && habit.targetCount != null) {
    return 'count';
  }

  return trackingType;
}
