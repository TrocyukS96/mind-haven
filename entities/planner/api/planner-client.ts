import type { Goal } from '@/entities/goal/model/types';
import type { Task } from '@/entities/task/model/types';
import type { PlannerData, PlannerOutboxItem, PlannerSnapshot } from '@/shared/lib/planner/planner-merge';

export class PlannerApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new PlannerApiError(payload.error ?? 'Request failed', response.status);
  }

  return payload;
}

export async function importPlannerRequest(snapshot: PlannerSnapshot): Promise<PlannerData> {
  const response = await fetch('/api/planner/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  const payload = await parseResponse<{ planner: PlannerData }>(response);
  return payload.planner;
}

export async function createGoalRequest(goal: Goal): Promise<Goal> {
  const response = await fetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  });
  const payload = await parseResponse<{ goal: Goal }>(response);
  return payload.goal;
}

export async function updateGoalRequest(id: string, goal: Partial<Goal>): Promise<Goal> {
  const response = await fetch(`/api/goals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  });
  const payload = await parseResponse<{ goal: Goal }>(response);
  return payload.goal;
}

export async function deleteGoalRequest(id: string): Promise<void> {
  const response = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
  if (response.status === 404) return;
  await parseResponse<{ ok: true }>(response);
}

function serializeTask(task: Partial<Task>) {
  if (!('goalId' in task)) return task;
  return { ...task, goalId: task.goalId ?? null };
}

export async function createTaskRequest(task: Task): Promise<Task> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serializeTask(task)),
  });
  const payload = await parseResponse<{ task: Task }>(response);
  return payload.task;
}

export async function updateTaskRequest(id: string, task: Partial<Task>): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serializeTask(task)),
  });
  const payload = await parseResponse<{ task: Task }>(response);
  return payload.task;
}

export async function deleteTaskRequest(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  if (response.status === 404) return;
  await parseResponse<{ ok: true }>(response);
}

export async function reorderPlannerRequest(input: {
  goals?: { id: string; type: string; kanbanOrder: number }[];
  tasks?: { id: string; type: string; kanbanOrder: number }[];
}): Promise<void> {
  const response = await fetch('/api/planner/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  await parseResponse<{ ok: true }>(response);
}

export async function savePlannerLayoutRequest(input: {
  goalsKanbanColumnOrder: string[];
  tasksKanbanColumnOrder: string[];
}): Promise<void> {
  const response = await fetch('/api/planner/layout', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  await parseResponse<{ ok: true }>(response);
}

export type { PlannerOutboxItem };
