import type { HabitFormDraft } from '@/features/habit/lib/map-voice-to-habit-draft';
import type { HabitFrequencyKey } from '@/features/habit/lib/habit-frequency';

export interface HabitFormValues {
  name: string;
  frequency: HabitFrequencyKey;
}

export function buildHabitFormValues(draft?: HabitFormDraft | null): HabitFormValues {
  if (draft) {
    return {
      name: draft.name,
      frequency: draft.frequency ?? 'daily',
    };
  }

  return {
    name: '',
    frequency: 'daily',
  };
}

export function getHabitFormKey(draft?: HabitFormDraft | null): string {
  if (draft) {
    return `voice-${draft.name}-${draft.frequency ?? 'daily'}`;
  }

  return 'new';
}
