import type { HabitTrackingType } from '@/entities/habit/model/tracking-type';

export interface Habit {
  id: string;
  name: string;
  frequency: string;
  streak: number;
  completedDays: string[];
  trackingType: HabitTrackingType;
  targetCount: number | null;
  dayCounts: Record<string, number>;
}
