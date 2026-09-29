import type { Habit } from '@/entities/habit/model/types';
import type { HabitTrackingType } from '@/entities/habit/model/tracking-type';
import type { HabitFormDraft } from '@/features/habit/lib/map-voice-to-habit-draft';
import {
  frequencyKeyFromStored,
  type HabitFrequencyKey,
} from '@/features/habit/lib/habit-frequency';

export interface HabitFormValues {
  name: string;
  frequency: HabitFrequencyKey;
  trackingType: HabitTrackingType;
  targetCount: string;
  weekdays: number[];
}

const EMPTY_VALUES: HabitFormValues = {
  name: '',
  frequency: 'daily',
  trackingType: 'check',
  targetCount: '',
  weekdays: [],
};

export function buildHabitFormValues(options?: {
  draft?: HabitFormDraft | null;
  habit?: Habit | null;
}): HabitFormValues {
  if (options?.habit) {
    const frequency = frequencyKeyFromStored(options.habit.frequency);
    return {
      name: options.habit.name,
      frequency: frequency.key,
      trackingType: options.habit.trackingType,
      targetCount: options.habit.targetCount ? String(options.habit.targetCount) : '',
      weekdays: frequency.weekdays,
    };
  }

  if (options?.draft) {
    return {
      ...EMPTY_VALUES,
      name: options.draft.name,
      frequency: options.draft.frequency ?? 'daily',
    };
  }

  return EMPTY_VALUES;
}

export function getHabitFormKey(draft?: HabitFormDraft | null, habit?: Habit | null): string {
  if (habit) return `edit-${habit.id}`;
  if (draft) return `voice-${draft.name}-${draft.frequency ?? 'daily'}`;
  return 'new';
}
