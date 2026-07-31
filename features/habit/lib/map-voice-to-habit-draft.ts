import type { HabitFrequencyKey } from '@/features/habit/lib/habit-frequency';
import type { ParsedHabitVoiceResult } from '@/shared/lib/voice/parsers/habit-parser';

export interface HabitFormDraft {
  name: string;
  frequency?: HabitFrequencyKey;
}

export function mapVoiceResultToHabitDraft(parsed: ParsedHabitVoiceResult): HabitFormDraft {
  return {
    name: parsed.name,
    frequency: parsed.frequency ?? undefined,
  };
}
