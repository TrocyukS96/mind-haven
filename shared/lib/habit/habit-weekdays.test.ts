import { describe, expect, it } from 'vitest';
import {
  calculateHabitStreak,
  getHabitMonthDates,
  getHabitRangeDates,
  getHabitWeekDates,
  getHabitYearDates,
  mondayOffset,
} from '@/shared/lib/habit/habit-date';
import { getHabitCountPresentation } from '@/shared/lib/habit/habit-progress';
import {
  decodeHabitWeekdays,
  encodeHabitWeekdays,
  isHabitScheduledOn,
} from '@/shared/lib/habit/habit-weekdays';

describe('habit weekdays', () => {
  const schedule = (date: string) => isHabitScheduledOn('days:1,3', date);

  it('starts the visible week on Monday', () => {
    expect(getHabitWeekDates('2026-09-29')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(getHabitWeekDates('2026-10-04')[0]).toBe('2026-09-28');
  });

  it('lists every day of the current month and year', () => {
    const month = getHabitMonthDates('2026-09-29');
    expect(month[0]).toBe('2026-09-01');
    expect(month.at(-1)).toBe('2026-09-30');
    expect(month).toHaveLength(30);
    expect(mondayOffset(month[0])).toBe(1);

    const year = getHabitYearDates('2026-09-29');
    expect(year[0]).toBe('2026-01-01');
    expect(year.at(-1)).toBe('2026-12-31');
    expect(year).toHaveLength(365);
    expect(getHabitRangeDates('week', '2026-09-29')).toEqual(getHabitWeekDates('2026-09-29'));
  });

  it('stores selected days from Monday through Sunday', () => {
    expect(encodeHabitWeekdays([0, 3, 1])).toBe('days:1,3,0');
    expect(decodeHabitWeekdays('days:1,3,0')).toEqual([1, 3, 0]);
  });

  it('keeps only the chosen weekdays open', () => {
    expect(isHabitScheduledOn('days:1,3', '2026-09-28')).toBe(true);
    expect(isHabitScheduledOn('days:1,3', '2026-09-29')).toBe(false);
    expect(isHabitScheduledOn('Ежедневно', '2026-09-29')).toBe(true);
  });

  it('continues a streak across days that are not selected', () => {
    expect(calculateHabitStreak(['2026-09-23', '2026-09-28'], '2026-09-29', schedule)).toBe(2);
    expect(calculateHabitStreak(['2026-09-23'], '2026-09-29', schedule)).toBe(0);
    expect(calculateHabitStreak(['2026-09-23'], '2026-09-28', schedule)).toBe(1);
  });

  it('colors each selected day on its own, without a weekly total', () => {
    const habit = {
      frequency: 'days:1,3',
      targetCount: 10,
      dayCounts: { '2026-09-28': 15 },
    };

    expect(getHabitCountPresentation(habit, '2026-09-28', '2026-09-29')).toEqual({
      value: 15,
      showTarget: true,
      tone: 'over',
    });
  });
});
