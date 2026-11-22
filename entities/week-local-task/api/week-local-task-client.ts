import type { Task } from '@/entities/task/model/types';
import type { TaskColumn } from '@/entities/task-column/model/types';
import { PlannerApiError } from '@/entities/planner/api/planner-client';
import type {
  WeekLayoutPatch,
  WeekLocalStatus,
  WeekLocalTask,
  WeekTaskPlacement,
} from '@/entities/week-local-task/model/types';
import type { TaskPriority } from '@/entities/task/model/types';

export interface WeekBoardPayload {
  column: TaskColumn;
  localTasks: WeekLocalTask[];
  placements: WeekTaskPlacement[];
  tasks: Task[];
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new PlannerApiError(payload.error ?? 'Request failed', response.status);
  }
  return payload;
}

export async function getWeekBoardRequest(columnId: string): Promise<WeekBoardPayload> {
  const response = await fetch(`/api/task-columns/${columnId}/week-board`);
  return parseResponse<WeekBoardPayload>(response);
}

export async function saveWeekLayoutRequest(
  columnId: string,
  patch: WeekLayoutPatch
): Promise<WeekBoardPayload> {
  const response = await fetch(`/api/task-columns/${columnId}/week-board`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return parseResponse<WeekBoardPayload>(response);
}

export async function createWeekLocalTaskRequest(
  columnId: string,
  input: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: WeekLocalStatus;
    plannedDate?: string | null;
  }
): Promise<WeekLocalTask> {
  const response = await fetch(`/api/task-columns/${columnId}/local-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ task: WeekLocalTask }>(response);
  return payload.task;
}

export async function updateWeekLocalTaskRequest(
  columnId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: WeekLocalStatus;
    plannedDate?: string | null;
    sortOrder?: number;
  }
): Promise<WeekLocalTask> {
  const response = await fetch(`/api/task-columns/${columnId}/local-tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ task: WeekLocalTask }>(response);
  return payload.task;
}

export async function deleteWeekLocalTaskRequest(columnId: string, taskId: string): Promise<void> {
  const response = await fetch(`/api/task-columns/${columnId}/local-tasks/${taskId}`, {
    method: 'DELETE',
  });
  await parseResponse<{ ok: true }>(response);
}
