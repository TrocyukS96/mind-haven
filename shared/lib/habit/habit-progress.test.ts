import { describe, expect, it } from 'vitest';
import { resolveHabitTrackingType } from '@/entities/habit/model/tracking-type';
import {
  applyDayCount,
  completedDaysFromCounts,
  getHabitCountPresentation,
  getHabitCountTone,
  isHabitDayMet,
  normalizeTargetCount,
} from '@/shared/lib/habit/habit-progress';

describe('habit progress', () => {
  it('colors an exact count as exact and a larger count as over', () => {
    expect(getHabitCountTone(50, 50)).toBe('exact');
    expect(getHabitCountTone(55, 50)).toBe('over');
    expect(getHabitCountTone(30, 50)).toBe('under');
    expect(getHabitCountTone(0, 50)).toBe('empty');
  });

  it('counts a day complete only when the amount reaches the target', () => {
    const habit = {
      targetCount: 50,
      completedDays: ['2026-09-28'],
      dayCounts: { '2026-09-28': 55, '2026-09-29': 40 },
    };

    expect(isHabitDayMet(habit, '2026-09-28')).toBe(true);
    expect(isHabitDayMet(habit, '2026-09-29')).toBe(false);
    expect(completedDaysFromCounts(applyDayCount(habit.dayCounts, '2026-09-29', 50), 50)).toEqual([
      '2026-09-28',
      '2026-09-29',
    ]);
  });

  it('colors the period total on the last run of the week', () => {
    const habit = {
      frequency: 'Еженедельно',
      targetCount: 10,
      dayCounts: {
        '2026-09-28': 6,
        '2026-09-30': 9,
      },
    };

    expect(getHabitCountPresentation(habit, '2026-09-28', '2026-09-30')).toEqual({
      value: 6,
      showTarget: false,
      tone: 'under',
    });
    expect(getHabitCountPresentation(habit, '2026-09-30', '2026-09-30')).toEqual({
      value: 15,
      showTarget: true,
      tone: 'over',
    });
    expect(
      getHabitCountPresentation(
        { ...habit, dayCounts: { '2026-09-28': 6, '2026-09-30': 4 } },
        '2026-09-30',
        '2026-09-30'
      )?.tone
    ).toBe('exact');
  });

  it('keeps a weekly total inside Monday–Sunday and ignores the previous week', () => {
    const habit = {
      frequency: 'Еженедельно',
      targetCount: 10,
      dayCounts: {
        '2026-09-23': 5,
        '2026-09-27': 5,
        '2026-09-28': 4,
        '2026-09-29': 3,
      },
    };

    expect(getHabitCountPresentation(habit, '2026-09-27', '2026-09-29')).toMatchObject({
      value: 10,
      showTarget: true,
      tone: 'exact',
    });
    expect(getHabitCountPresentation(habit, '2026-09-23', '2026-09-29')).toMatchObject({
      value: 5,
      showTarget: false,
    });
    expect(getHabitCountPresentation(habit, '2026-09-29', '2026-09-29')).toMatchObject({
      value: 7,
      showTarget: true,
      tone: 'under',
    });
  });

  it('sums a month and a year on their last logged day', () => {
    const monthly = {
      frequency: 'Ежемесячно',
      targetCount: 10,
      dayCounts: { '2026-09-02': 4, '2026-09-29': 8 },
    };
    expect(getHabitCountPresentation(monthly, '2026-09-29', '2026-09-29')).toMatchObject({
      value: 12,
      showTarget: true,
      tone: 'over',
    });

    const yearly = {
      frequency: 'Ежегодно',
      targetCount: 10,
      dayCounts: { '2026-01-03': 7, '2026-09-29': 4 },
    };
    expect(getHabitCountPresentation(yearly, '2026-09-29', '2026-09-29')).toMatchObject({
      value: 11,
      showTarget: true,
      tone: 'over',
    });
    expect(getHabitCountPresentation(yearly, '2026-01-03', '2026-09-29')).toMatchObject({
      value: 7,
      showTarget: false,
    });
  });

  it('keeps a checkmark as the default type and preserves a measured goal', () => {
    expect(resolveHabitTrackingType({ trackingType: null, targetCount: null })).toBe('check');
    expect(resolveHabitTrackingType({ trackingType: 'check', targetCount: 50 })).toBe('count');
    expect(resolveHabitTrackingType({ trackingType: 'minutes', targetCount: 10 })).toBe('minutes');
  });

  it('keeps an empty target as a checkmark habit', () => {
    expect(normalizeTargetCount(null)).toBeNull();
    expect(normalizeTargetCount('')).toBeNull();
    expect(normalizeTargetCount(50)).toBe(50);
  });
});
