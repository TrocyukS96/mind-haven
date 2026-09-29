import { decodeHabitWeekdays } from '@/shared/lib/habit/habit-weekdays';

export type HabitFrequencyKey = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekends' | 'custom';

export const HABIT_FREQUENCY_KEYS: HabitFrequencyKey[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'weekends',
  'custom',
];

const FREQUENCY_ALIASES: Record<string, HabitFrequencyKey> = {
  daily: 'daily',
  everyday: 'daily',
  'every day': 'daily',
  ежедневно: 'daily',
  'каждый день': 'daily',
  weekly: 'weekly',
  еженедельно: 'weekly',
  threeperweek: 'weekly',
  '3 per week': 'weekly',
  '3 times a week': 'weekly',
  '3 раза в неделю': 'weekly',
  'три раза в неделю': 'weekly',
  fiveperweek: 'weekly',
  '5 per week': 'weekly',
  '5 times a week': 'weekly',
  '5 раз в неделю': 'weekly',
  'пять раз в неделю': 'weekly',
  monthly: 'monthly',
  ежемесячно: 'monthly',
  yearly: 'yearly',
  ежегодно: 'yearly',
  annually: 'yearly',
  weekends: 'weekends',
  weekend: 'weekends',
  'по выходным': 'weekends',
  выходные: 'weekends',
  custom: 'custom',
  'selected days': 'custom',
  'specific days': 'custom',
  'по дням': 'custom',
  'по дням недели': 'custom',
  'в выбранные дни': 'custom',
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

export function frequencyKeyFromStored(frequency: string): {
  key: HabitFrequencyKey;
  weekdays: number[];
} {
  const weekdays = decodeHabitWeekdays(frequency);
  if (weekdays) {
    return { key: 'custom', weekdays };
  }

  return { key: normalizeHabitFrequency(frequency) ?? 'daily', weekdays: [] };
}
