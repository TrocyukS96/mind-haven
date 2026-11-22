import type { Task } from '@/entities/task/model/types';
import type { WeekLayoutPatch, WeekLocalStatus, WeekTaskPlacement } from '@/entities/week-local-task/model/types';
import {
  resolveTaskColumnId,
  startOfLocalDay,
  toDateInputValue,
} from '@/shared/lib/planner/week-column-range';

export const WEEK_BACKLOG_LANE = 'backlog';

export interface WeekCardRef {
  kind: 'main' | 'local';
  id: string;
  sortOrder: number;
}

export interface WeekMainRef {
  id: string;
  userId?: string;
  columnId?: string | null;
  type?: string | null;
  kanbanOrder?: number;
  completed: boolean;
}

export interface WeekLocalRef {
  id: string;
  plannedDate?: string | null;
  sortOrder: number;
  status: string;
}

export interface WeekPlacementRef {
  taskId: string;
  plannedDate?: string | null;
  sortOrder: number;
}

export interface WeekProgressCount {
  completed: number;
  total: number;
}

export function keyToPlannedDate(key: string | null | undefined): Date | null {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function plannedDateToKey(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function weekDayKeys(dateFrom?: string | null, dateTo?: string | null): string[] {
  if (!dateFrom || !dateTo) return [];
  const start = startOfLocalDay(new Date(dateFrom));
  const end = startOfLocalDay(new Date(dateTo));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() > end.getTime()) {
    return [];
  }

  const keys: string[] = [];
  for (let cursor = start, guard = 0; cursor.getTime() <= end.getTime() && guard < 31; guard += 1) {
    keys.push(toDateInputValue(cursor.toISOString()));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return keys;
}

export function laneForPlannedDate(plannedDate: string | null | undefined, dayKeys: string[]): string {
  const key = plannedDateToKey(plannedDate);
  return key && dayKeys.includes(key) ? key : WEEK_BACKLOG_LANE;
}

export function cardKey(card: Pick<WeekCardRef, 'kind' | 'id'>): string {
  return `${card.kind}:${card.id}`;
}

export function parseCardKey(value: string): Pick<WeekCardRef, 'kind' | 'id'> | null {
  if (value.startsWith('local:')) return { kind: 'local', id: value.slice('local:'.length) };
  if (value.startsWith('main:')) return { kind: 'main', id: value.slice('main:'.length) };
  return null;
}

export function canReadWeekColumn(
  column: { userId: string } | null | undefined,
  userId: string
): boolean {
  return Boolean(column && column.userId === userId);
}

export function canMutateWeekColumn(
  column: { userId: string; archivedAt?: Date | string | null } | null | undefined,
  userId: string
): boolean {
  return canReadWeekColumn(column, userId) && !column?.archivedAt;
}

export function isWeekLocalDone(status: string): boolean {
  return status === 'done';
}

export function weekBoardProgress(
  mainTasks: Array<{ completed: boolean }>,
  localTasks: Array<{ status: string }>
): { main: WeekProgressCount; local: WeekProgressCount; overallPercent: number } {
  const main = {
    completed: mainTasks.filter((task) => task.completed).length,
    total: mainTasks.length,
  };
  const local = {
    completed: localTasks.filter((task) => isWeekLocalDone(task.status)).length,
    total: localTasks.length,
  };
  const total = main.total + local.total;
  const completed = main.completed + local.completed;
  return {
    main,
    local,
    overallPercent: total === 0 ? 0 : Math.round((completed * 100) / total),
  };
}

export function allowedPlacementTaskIds(
  tasks: Array<{ id: string; userId: string; columnId?: string | null; type?: string | null }>,
  columns: Array<{ id: string; legacyKey?: string | null }>,
  weekColumnId: string,
  userId: string
): Set<string> {
  return new Set(
    tasks
      .filter(
        (task) => task.userId === userId && resolveTaskColumnId(task, columns) === weekColumnId
      )
      .map((task) => task.id)
  );
}

export function buildWeekLanes(
  dayKeys: string[],
  mains: WeekMainRef[],
  locals: WeekLocalRef[],
  placements: WeekPlacementRef[]
): Record<string, WeekCardRef[]> {
  const lanes: Record<string, WeekCardRef[]> = { [WEEK_BACKLOG_LANE]: [] };
  for (const day of dayKeys) lanes[day] = [];

  const placementByTask = new Map(placements.map((item) => [item.taskId, item]));

  for (const task of mains) {
    const placement = placementByTask.get(task.id);
    const lane = laneForPlannedDate(placement?.plannedDate, dayKeys);
    lanes[lane].push({
      kind: 'main',
      id: task.id,
      sortOrder: placement?.sortOrder ?? task.kanbanOrder ?? 0,
    });
  }

  for (const local of locals) {
    const lane = laneForPlannedDate(local.plannedDate, dayKeys);
    lanes[lane].push({ kind: 'local', id: local.id, sortOrder: local.sortOrder });
  }

  for (const lane of Object.keys(lanes)) {
    lanes[lane].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  }

  return lanes;
}

export function lanesFromCardKeys(lanes: Record<string, string[]>): Record<string, WeekCardRef[]> {
  return Object.fromEntries(
    Object.entries(lanes).map(([lane, keys]) => [
      lane,
      keys.flatMap((key, sortOrder) => {
        const card = parseCardKey(key);
        return card ? [{ ...card, sortOrder }] : [];
      }),
    ])
  );
}

export function layoutPatchFromLanes(lanes: Record<string, WeekCardRef[]>): WeekLayoutPatch {
  const localTasks: WeekLayoutPatch['localTasks'] = [];
  const placements: WeekLayoutPatch['placements'] = [];

  for (const [lane, cards] of Object.entries(lanes)) {
    const plannedDate = lane === WEEK_BACKLOG_LANE ? null : lane;
    cards.forEach((card, sortOrder) => {
      if (card.kind === 'local') {
        localTasks.push({ id: card.id, plannedDate, sortOrder });
        return;
      }
      placements.push({ taskId: card.id, plannedDate, sortOrder });
    });
  }

  return { localTasks, placements };
}

export function applyLayoutPatch<T extends { id: string; plannedDate?: string | null; sortOrder: number }>(
  localTasks: T[],
  placements: WeekTaskPlacement[],
  patch: WeekLayoutPatch,
  weekColumnId: string
): { localTasks: T[]; placements: WeekTaskPlacement[] } {
  const localById = new Map(patch.localTasks.map((item) => [item.id, item]));
  const nextLocals = localTasks.map((task) => {
    const next = localById.get(task.id);
    return next ? { ...task, plannedDate: next.plannedDate, sortOrder: next.sortOrder } : task;
  });
  const placementByTask = new Map(placements.map((item) => [item.taskId, item]));
  for (const item of patch.placements) {
    placementByTask.set(item.taskId, {
      taskId: item.taskId,
      weekColumnId,
      plannedDate: item.plannedDate,
      sortOrder: item.sortOrder,
    });
  }
  return { localTasks: nextLocals, placements: [...placementByTask.values()] };
}

export function isWeekLocalStatus(value: string): value is WeekLocalStatus {
  return value === 'todo' || value === 'in_progress' || value === 'done';
}

export function mainTasksOnWeek(tasks: Task[], weekColumnId: string, columns: Array<{ id: string; legacyKey?: string | null }>): Task[] {
  return tasks.filter((task) => resolveTaskColumnId(task, columns) === weekColumnId);
}
