import { describe, expect, it } from 'vitest';
import { evaluateDay } from '@/shared/lib/ascent/day-result';
import { habitObligationForDate } from '@/shared/lib/ascent/habit-obligation';
import { encodeHabitWeekdays } from '@/shared/lib/habit/habit-weekdays';

const weekdays = encodeHabitWeekdays([1, 2, 3, 4, 5]);

describe('challenge habits reuse habit completion', () => {
  it('marks a count habit only when the existing target is reached', () => {
    const habit = {
      id: 'habit0001',
      name: 'Push-ups',
      frequency: 'Ежедневно',
      targetCount: 100,
      completedDays: [] as string[],
      dayCounts: { '2026-11-22': 40, '2026-11-23': 100 },
    };

    expect(habitObligationForDate(habit, '2026-11-22', { required: true, sortOrder: 1 })).toMatchObject({
      scheduled: true,
      met: false,
    });
    expect(habitObligationForDate(habit, '2026-11-23', { required: true, sortOrder: 1 }).met).toBe(true);
  });

  it('does not fail the challenge on a weekday the habit is not scheduled', () => {
    const habit = {
      id: 'habit0002',
      name: 'Reading',
      frequency: weekdays,
      targetCount: null,
      completedDays: [] as string[],
      dayCounts: {},
    };
    const sunday = habitObligationForDate(habit, '2026-11-22', { required: true, sortOrder: 1 });
    const monday = habitObligationForDate(habit, '2026-11-23', { required: true, sortOrder: 1 });

    expect(sunday.scheduled).toBe(false);
    expect(monday.scheduled).toBe(true);
    expect(monday.met).toBe(false);

    const day = evaluateDay({
      streakAtStart: 1,
      finalize: true,
      habits: [sunday],
      restrictions: [
        {
          id: 'core',
          title: 'Smoking',
          kind: 'core_behavior',
          required: true,
          active: true,
          bypassable: false,
          unlockAfterSuccessfulDays: 0,
          honored: true,
          violated: false,
          bypassed: false,
          sortOrder: 0,
        },
      ],
    });

    expect(day.status).toBe('successful');
    expect(day.items.find((item) => item.sourceId === 'habit0002')?.state).toBe('not_applicable');
  });

  it('fails a scheduled habit that the habit tracker does not count as done', () => {
    const habit = {
      id: 'habit0002',
      name: 'Reading',
      frequency: weekdays,
      targetCount: null,
      completedDays: [] as string[],
      dayCounts: {},
    };
    const day = evaluateDay({
      streakAtStart: 1,
      finalize: true,
      habits: [habitObligationForDate(habit, '2026-11-23', { required: true, sortOrder: 0 })],
    });

    expect(day.status).toBe('failed');
    expect(day.failureReason).toBe('habit_unmet');
  });
});
