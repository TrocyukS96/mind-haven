import { describe, expect, it } from 'vitest';
import { normalizeParsedHabit } from '@/shared/lib/voice/parsers/habit-parser';

describe('normalizeParsedHabit', () => {
  it('parses a complete habit payload', () => {
    const result = normalizeParsedHabit({
      name: ' Медитация ',
      frequency: 'daily',
    });

    expect(result).toEqual({
      name: 'Медитация',
      frequency: 'daily',
    });
  });

  it('normalizes frequency aliases', () => {
    const result = normalizeParsedHabit({
      name: 'Чтение',
      frequency: '3 раза в неделю',
    });

    expect(result.frequency).toBe('threePerWeek');
  });

  it('throws when name is missing', () => {
    expect(() => normalizeParsedHabit({ frequency: 'daily' })).toThrow(
      'Habit name is missing from AI response'
    );
  });

  it('allows null frequency', () => {
    const result = normalizeParsedHabit({
      name: 'Спорт',
      frequency: null,
    });

    expect(result).toEqual({
      name: 'Спорт',
      frequency: null,
    });
  });
});
