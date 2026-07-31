import {
  normalizeHabitFrequency,
  type HabitFrequencyKey,
} from '@/features/habit/lib/habit-frequency';

export interface ParsedHabitVoiceResult {
  name: string;
  frequency?: HabitFrequencyKey | null;
}

export const HABIT_PARSER_SYSTEM_PROMPT = `You extract structured habit data from transcribed speech.

IMPORTANT: Reply with ONLY a raw JSON object. Do not use markdown, code blocks, comments, or any text before or after JSON.

Schema:
{
  "name": string,
  "frequency": "daily" | "threePerWeek" | "fivePerWeek" | "weekends" | null
}

Rules:
- "name" is required and must be a concise habit name.
- "frequency" values:
  - "daily" — every day, ежедневно, каждый день
  - "threePerWeek" — 3 times a week, три раза в неделю
  - "fivePerWeek" — 5 times a week, пять раз в неделю
  - "weekends" — on weekends, по выходным
- If no frequency mentioned, frequency is null.
- Do not invent information not implied by the speech.`;

export function normalizeParsedHabit(raw: unknown): ParsedHabitVoiceResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid habit parse response');
  }

  const data = raw as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name.trim() : '';

  if (!name) {
    throw new Error('Habit name is missing from AI response');
  }

  const frequency = normalizeHabitFrequency(data.frequency);

  return {
    name,
    frequency,
  };
}
