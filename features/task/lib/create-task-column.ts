import {
  createNextWeekColumnRequest,
  createTaskColumnRequest,
  listTaskColumnsRequest,
} from '@/entities/task-column/api/task-column-client';
import type { TaskColumn } from '@/entities/task-column/model/types';
import { isPlannerApiEnabled } from '@/entities/planner/lib/resolve-planner-api';
import {
  computeNextWeekRange,
  findOverlappingWeek,
  formatWeekTitle,
} from '@/shared/lib/planner/week-column-range';
import type { AppStore } from '@/shared/store/store-config';

async function publishColumn(getState: () => AppStore, saved: TaskColumn): Promise<TaskColumn> {
  try {
    const listed = await listTaskColumnsRequest();
    getState().replaceTaskColumns(listed, 'active');
  } catch {
    getState().addTaskColumn(saved.title, saved.kind, saved.dateFrom, saved.dateTo, saved);
  }

  if (!getState().taskColumns.some((column) => column.id === saved.id)) {
    getState().addTaskColumn(saved.title, saved.kind, saved.dateFrom, saved.dateTo, saved);
  }

  return getState().taskColumns.find((column) => column.id === saved.id) ?? saved;
}

export async function createWeekColumn(
  getState: () => AppStore,
  input?: { dateFrom: string; dateTo: string }
): Promise<TaskColumn> {
  const columns = getState().taskColumns;
  const range = input
    ? { dateFrom: new Date(input.dateFrom), dateTo: new Date(input.dateTo) }
    : computeNextWeekRange(columns);

  if (
    Number.isNaN(range.dateFrom.getTime()) ||
    Number.isNaN(range.dateTo.getTime()) ||
    range.dateFrom > range.dateTo
  ) {
    throw new Error('INVALID_RANGE');
  }
  if (findOverlappingWeek(columns, range.dateFrom, range.dateTo)) {
    throw new Error('WEEK_RANGE_OVERLAP');
  }

  const dateFrom = input?.dateFrom ?? range.dateFrom.toISOString();
  const dateTo = input?.dateTo ?? range.dateTo.toISOString();
  const title = formatWeekTitle(range.dateFrom, range.dateTo);

  if (!isPlannerApiEnabled()) {
    const created = getState().addTaskColumn(title, 'week', dateFrom, dateTo);
    if (!created) throw new Error('Failed to create column');
    return created;
  }

  const saved = input
    ? await createTaskColumnRequest({ title, kind: 'week', dateFrom, dateTo })
    : await createNextWeekColumnRequest({ title, dateFrom, dateTo });

  return publishColumn(getState, saved);
}

export async function createCustomColumn(getState: () => AppStore, title: string): Promise<TaskColumn> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Column title is required');

  if (!isPlannerApiEnabled()) {
    const created = getState().addTaskColumn(trimmed, 'custom');
    if (!created) throw new Error('Failed to create column');
    return created;
  }

  const saved = await createTaskColumnRequest({ title: trimmed, kind: 'custom' });
  return publishColumn(getState, saved);
}
