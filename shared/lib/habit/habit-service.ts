import type { Habit } from '@/entities/habit/model/types';
import { prisma } from '@/shared/lib/db';

export interface HabitInput {
  name: string;
  frequency: string;
}

export interface HabitDbRow {
  id: string;
  userId: string;
  name: string;
  frequency: string;
  streak: number;
  completedDays: unknown;
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
  };
}

function normalizeHabitInput(input: HabitInput): HabitInput {
  const name = input.name.trim();
  const frequency = input.frequency.trim();

  if (!name) {
    throw new Error('Habit name is required');
  }

  if (!frequency) {
    throw new Error('Habit frequency is required');
  }

  return { name, frequency };
}

function validateDateString(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Invalid date format');
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

  const row = await prisma.habit.create({
    data: {
      userId,
      name: data.name,
      frequency: data.frequency,
      streak: 0,
      completedDays: [],
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
  validateDateString(date);

  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!existing) {
    throw new Error('Habit not found');
  }

  const habit = mapHabitFromDb(existing);
  const wasCompleted = habit.completedDays.includes(date);
  const nextStreak = wasCompleted ? Math.max(0, habit.streak - 1) : habit.streak + 1;
  const completedDays = wasCompleted
    ? habit.completedDays.filter((d) => d !== date)
    : [...habit.completedDays, date];

  const row = await prisma.habit.update({
    where: { id: habitId },
    data: {
      streak: nextStreak,
      completedDays,
    },
  });

  return mapHabitFromDb(row);
}
