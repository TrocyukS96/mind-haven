import type { Habit } from '@/entities/habit/model/types';
import { buildActivityInput } from '@/entities/activity/lib/build-activity-input';
import { recordActivityEvent } from '@/shared/lib/activity/activity-service';
import { prisma } from '@/shared/lib/db';
import { calculateHabitStreak, getHabitToday, shiftHabitDate } from '@/shared/lib/habit/habit-date';
import { isHabitScheduledOn, normalizeStoredHabitFrequency } from '@/shared/lib/habit/habit-weekdays';
import {
  normalizeHabitTrackingType,
  resolveHabitTrackingType,
  type HabitTrackingType,
} from '@/entities/habit/model/tracking-type';
import {
  applyDayCount,
  completedDaysFromCounts,
  isHabitDayMet,
  normalizeDayCount,
  normalizeTargetCount,
  parseDayCounts,
  realignHabitProgress,
} from '@/shared/lib/habit/habit-progress';

export interface HabitInput {
  name: string;
  frequency: string;
  trackingType?: string | null;
  targetCount?: number | null;
}

export interface HabitDbRow {
  id: string;
  userId: string;
  name: string;
  frequency: string;
  streak: number;
  completedDays: unknown;
  trackingType: string;
  targetCount: number | null;
  dayCounts: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function parseCompletedDays(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function mapHabitFromDb(row: HabitDbRow): Habit {
  return {
    id: row.id,
    name: row.name,
    frequency: row.frequency,
    streak: row.streak,
    completedDays: parseCompletedDays(row.completedDays),
    trackingType: resolveHabitTrackingType({
      trackingType: row.trackingType,
      targetCount: row.targetCount,
    }),
    targetCount: row.targetCount,
    dayCounts: parseDayCounts(row.dayCounts),
  };
}

interface NormalizedHabitInput {
  name: string;
  frequency: string;
  trackingType: HabitTrackingType;
  targetCount: number | null;
}

function normalizeHabitInput(input: HabitInput): NormalizedHabitInput {
  const name = input.name.trim();
  const frequency = normalizeStoredHabitFrequency(input.frequency);

  if (!name) {
    throw new Error('Habit name is required');
  }

  if (!frequency) {
    throw new Error('Habit frequency is required');
  }

  const trackingType = normalizeHabitTrackingType(input.trackingType);
  const targetCount = trackingType === 'check' ? null : normalizeTargetCount(input.targetCount);

  if (trackingType !== 'check' && targetCount == null) {
    throw new Error('Target count is required');
  }

  return {
    name,
    frequency,
    trackingType,
    targetCount,
  };
}

function validateDateString(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Invalid date format');
  }
}

function assertHabitDateAllowed(value: string): void {
  validateDateString(value);

  const maxDate = shiftHabitDate(getHabitToday(), 1);
  if (value > maxDate) {
    throw new Error('Cannot mark a future day');
  }
}

export async function getHabits(userId: string): Promise<Habit[]> {
  const rows = await prisma.habit.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map(mapHabitFromDb);
}

export async function createHabit(userId: string, input: HabitInput): Promise<Habit> {
  const data = normalizeHabitInput(input);

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.habit.create({
      data: {
        userId,
        name: data.name,
        frequency: data.frequency,
        streak: 0,
        completedDays: [],
        trackingType: data.trackingType,
        targetCount: data.targetCount,
        dayCounts: {},
      },
    });

    await recordActivityEvent(
      userId,
      buildActivityInput({
        type: 'HABIT_CREATED',
        entityId: created.id,
        title: created.name,
        idempotencyKey: `habit:${created.id}:created`,
      }),
      tx
    );

    return created;
  });

  return mapHabitFromDb(row);
}

export async function updateHabit(userId: string, habitId: string, input: HabitInput): Promise<Habit> {
  const data = normalizeHabitInput(input);
  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!existing) {
    throw new Error('Habit not found');
  }

  const habit = mapHabitFromDb(existing);
  const progress = realignHabitProgress(habit, data.frequency, data.targetCount ?? null);

  const row = await prisma.habit.update({
    where: { id: habitId },
    data: {
      name: data.name,
      frequency: data.frequency,
      trackingType: data.trackingType,
      targetCount: data.targetCount,
      dayCounts: progress.dayCounts,
      completedDays: progress.completedDays,
      streak: progress.streak,
    },
  });

  return mapHabitFromDb(row);
}

export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error('Habit not found');
  }

  await prisma.habit.delete({ where: { id: habitId } });
}

export async function toggleHabitDay(
  userId: string,
  habitId: string,
  date: string
): Promise<Habit> {
  assertHabitDateAllowed(date);

  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!existing) {
    throw new Error('Habit not found');
  }

  const habit = mapHabitFromDb(existing);
  if (habit.targetCount != null) {
    throw new Error('This habit tracks a count');
  }

  if (!isHabitScheduledOn(habit.frequency, date)) {
    throw new Error('This day is not part of the habit schedule');
  }

  const wasCompleted = habit.completedDays.includes(date);
  const completedDays = wasCompleted
    ? habit.completedDays.filter((d) => d !== date)
    : [...habit.completedDays, date];
  const nextStreak = calculateHabitStreak(completedDays, getHabitToday(), (day) =>
    isHabitScheduledOn(habit.frequency, day)
  );

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.habit.update({
      where: { id: habitId },
      data: {
        streak: nextStreak,
        completedDays,
      },
    });

    if (!wasCompleted) {
      await recordActivityEvent(
        userId,
        buildActivityInput({
          type: 'HABIT_COMPLETED',
          entityId: habitId,
          title: habit.name,
          metadata: { date },
          idempotencyKey: `habit:${habitId}:completed:${date}`,
        }),
        tx
      );
    }

    return updated;
  });

  return mapHabitFromDb(row);
}

export async function setHabitDayCount(
  userId: string,
  habitId: string,
  date: string,
  count: number
): Promise<Habit> {
  assertHabitDateAllowed(date);
  const normalizedCount = normalizeDayCount(count);

  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!existing) {
    throw new Error('Habit not found');
  }

  const habit = mapHabitFromDb(existing);
  if (habit.targetCount == null) {
    throw new Error('This habit does not track a count');
  }

  if (!isHabitScheduledOn(habit.frequency, date)) {
    throw new Error('This day is not part of the habit schedule');
  }

  const wasCompleted = isHabitDayMet(habit, date);
  const dayCounts = applyDayCount(habit.dayCounts, date, normalizedCount);
  const completedDays = completedDaysFromCounts(dayCounts, habit.targetCount, habit.frequency);
  const nextStreak = calculateHabitStreak(completedDays, getHabitToday(), (day) =>
    isHabitScheduledOn(habit.frequency, day)
  );
  const isCompleted = normalizedCount >= habit.targetCount;

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.habit.update({
      where: { id: habitId },
      data: {
        streak: nextStreak,
        completedDays,
        dayCounts,
      },
    });

    if (!wasCompleted && isCompleted) {
      await recordActivityEvent(
        userId,
        buildActivityInput({
          type: 'HABIT_COMPLETED',
          entityId: habitId,
          title: habit.name,
          metadata: { date, count: normalizedCount },
          idempotencyKey: `habit:${habitId}:completed:${date}`,
        }),
        tx
      );
    }

    return updated;
  });

  return mapHabitFromDb(row);
}
