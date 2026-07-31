export type HabitFrequencyKey = 'daily' | 'threePerWeek' | 'fivePerWeek' | 'weekends';

export const HABIT_FREQUENCY_KEYS: HabitFrequencyKey[] = [
  'daily',
  'threePerWeek',
  'fivePerWeek',
  'weekends',
];

const FREQUENCY_ALIASES: Record<string, HabitFrequencyKey> = {
  daily: 'daily',
  everyday: 'daily',
  'every day': 'daily',
  ежедневно: 'daily',
  'каждый день': 'daily',
  threeperweek: 'threePerWeek',
  '3 per week': 'threePerWeek',
  '3 times a week': 'threePerWeek',
  '3 раза в неделю': 'threePerWeek',
  'три раза в неделю': 'threePerWeek',
  fiveperweek: 'fivePerWeek',
  '5 per week': 'fivePerWeek',
  '5 times a week': 'fivePerWeek',
  '5 раз в неделю': 'fivePerWeek',
  'пять раз в неделю': 'fivePerWeek',
  weekends: 'weekends',
  weekend: 'weekends',
  'по выходным': 'weekends',
  выходные: 'weekends',
};

export function normalizeHabitFrequency(value: unknown): HabitFrequencyKey | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (HABIT_FREQUENCY_KEYS.includes(normalized as HabitFrequencyKey)) {
    return normalized as HabitFrequencyKey;
  }

  return FREQUENCY_ALIASES[normalized] ?? null;
}
