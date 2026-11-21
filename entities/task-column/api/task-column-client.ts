import type { TaskColumn, TaskColumnKind, TaskColumnPatch } from '@/entities/task-column/model/types';
import { PlannerApiError } from '@/entities/planner/api/planner-client';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new PlannerApiError(payload.error ?? 'Request failed', response.status);
  }
  return payload;
}

export async function listTaskColumnsRequest(options?: {
  includeArchived?: boolean;
  archivedOnly?: boolean;
}): Promise<TaskColumn[]> {
  const params = new URLSearchParams();
  if (options?.includeArchived) params.set('includeArchived', 'true');
  if (options?.archivedOnly) params.set('archived', 'only');
  const query = params.toString();
  const response = await fetch(`/api/task-columns${query ? `?${query}` : ''}`);
  const payload = await parseResponse<{ columns: TaskColumn[] }>(response);
  return payload.columns;
}

export async function createTaskColumnRequest(input: {
  title: string;
  kind?: TaskColumnKind;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TaskColumn> {
  const response = await fetch('/api/task-columns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ column: TaskColumn }>(response);
  return payload.column;
}

export async function updateTaskColumnRequest(
  id: string,
  updates: TaskColumnPatch
): Promise<TaskColumn> {
  const response = await fetch(`/api/task-columns/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const payload = await parseResponse<{ column: TaskColumn }>(response);
  return payload.column;
}

export async function reorderTaskColumnsRequest(columnIds: string[]): Promise<void> {
  const response = await fetch('/api/task-columns/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnIds }),
  });
  await parseResponse<{ ok: true }>(response);
}

export async function deleteTaskColumnRequest(
  id: string,
  options?: { transferToColumnId?: string; deleteTasks?: boolean }
): Promise<void> {
  const params = new URLSearchParams();
  if (options?.transferToColumnId) params.set('transferTo', options.transferToColumnId);
  if (options?.deleteTasks) params.set('deleteTasks', 'true');
  const query = params.toString();
  const response = await fetch(`/api/task-columns/${id}${query ? `?${query}` : ''}`, {
    method: 'DELETE',
  });
  await parseResponse<{ ok: true }>(response);
}

export async function createNextWeekColumnRequest(input?: {
  dateFrom?: string;
  dateTo?: string;
  title?: string;
}): Promise<TaskColumn> {
  const response = await fetch('/api/task-columns/next-week', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input ?? {}),
  });
  const payload = await parseResponse<{ column: TaskColumn }>(response);
  return payload.column;
}
