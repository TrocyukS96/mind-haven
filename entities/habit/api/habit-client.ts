import type { Habit } from '@/entities/habit/model/types';
import type { HabitInput } from '@/shared/lib/habit/habit-service';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }

  return payload;
}

export async function fetchHabits(): Promise<Habit[]> {
  const response = await fetch('/api/habits');
  const payload = await parseResponse<{ habits: Habit[] }>(response);
  return payload.habits;
}

export async function createHabitRequest(input: HabitInput): Promise<Habit> {
  const response = await fetch('/api/habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ habit: Habit }>(response);
  return payload.habit;
}

export async function toggleHabitDayRequest(id: string, date: string): Promise<Habit> {
  const response = await fetch(`/api/habits/${id}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  const payload = await parseResponse<{ habit: Habit }>(response);
  return payload.habit;
}

export async function deleteHabitRequest(id: string): Promise<void> {
  const response = await fetch(`/api/habits/${id}`, {
    method: 'DELETE',
  });
  await parseResponse<{ ok: true }>(response);
}
