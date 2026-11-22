import type { Task, TaskPriority } from '@/entities/task/model/types';
import type {
  WeekLayoutPatch,
  WeekLocalStatus,
  WeekLocalTask,
  WeekTaskPlacement,
} from '@/entities/week-local-task/model/types';
import { WEEK_LOCAL_STATUSES } from '@/entities/week-local-task/model/types';
import { prisma } from '@/shared/lib/db';
import { mapColumn } from '@/shared/lib/planner/task-column-service';
import {
  allowedPlacementTaskIds,
  canMutateWeekColumn,
  canReadWeekColumn,
  isWeekLocalStatus,
  keyToPlannedDate,
  plannedDateToKey,
} from '@/shared/lib/planner/week-board';

const PRIORITIES = new Set<TaskPriority>(['low', 'medium', 'high', 'urgent']);

export class WeekBoardError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function priorityOf(value: unknown, fallback: TaskPriority = 'medium'): TaskPriority {
  return typeof value === 'string' && PRIORITIES.has(value as TaskPriority)
    ? (value as TaskPriority)
    : fallback;
}

function statusOf(value: unknown, fallback: WeekLocalStatus = 'todo'): WeekLocalStatus {
  return typeof value === 'string' && isWeekLocalStatus(value) ? value : fallback;
}

function finiteSortOrder(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function plannedDateOf(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new WeekBoardError('Invalid date', 400);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = keyToPlannedDate(value);
    if (!date) throw new WeekBoardError('Invalid date', 400);
    return date;
  }
  const parsed = plannedDateToKey(value);
  const date = parsed ? keyToPlannedDate(parsed) : null;
  if (!date) throw new WeekBoardError('Invalid date', 400);
  return date;
}

function mapLocalTask(row: {
  id: string;
  weekColumnId: string;
  title: string;
  description: string;
  plannedDate: Date | null;
  priority: string;
  status: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): WeekLocalTask {
  return {
    id: row.id,
    weekColumnId: row.weekColumnId,
    title: row.title,
    description: row.description || undefined,
    plannedDate: plannedDateToKey(row.plannedDate),
    priority: priorityOf(row.priority),
    status: statusOf(row.status),
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPlacement(row: {
  taskId: string;
  weekColumnId: string;
  plannedDate: Date | null;
  sortOrder: number;
}): WeekTaskPlacement {
  return {
    taskId: row.taskId,
    weekColumnId: row.weekColumnId,
    plannedDate: plannedDateToKey(row.plannedDate),
    sortOrder: row.sortOrder,
  };
}

function mapBoardTask(row: {
  id: string;
  goalId: string | null;
  projectId: string | null;
  columnId: string | null;
  title: string;
  description: string;
  completed: boolean;
  priority: string;
  type: string;
  kanbanOrder: number;
  stepOrder?: number;
  estimatedMinutes: number | null;
  createdAt: Date;
  completedAt: Date | null;
  deadline: Date | null;
  overdue: boolean;
}): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    completed: row.completed,
    priority: priorityOf(row.priority),
    type: row.type,
    goalId: row.goalId ?? undefined,
    projectId: row.projectId ?? undefined,
    columnId: row.columnId ?? undefined,
    estimatedMinutes: row.estimatedMinutes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    deadline: row.deadline?.toISOString(),
    overdue: row.overdue,
    kanbanOrder: row.kanbanOrder,
    stepOrder: row.stepOrder ?? 0,
  };
}

async function ownedWeek(userId: string, columnId: string, writable: boolean) {
  const column = await prisma.taskColumn.findFirst({ where: { id: columnId, userId } });
  if (!column || column.kind !== 'week' || !canReadWeekColumn(column, userId)) {
    throw new WeekBoardError('Week not found', 404);
  }
  if (writable && !canMutateWeekColumn(column, userId)) {
    throw new WeekBoardError('Week is archived', 403);
  }
  return column;
}

export async function getWeekBoard(userId: string, columnId: string) {
  const column = await ownedWeek(userId, columnId, false);
  const [localRows, placementRows, taskRows, columnRows] = await Promise.all([
    prisma.weekLocalTask.findMany({
      where: { userId, weekColumnId: column.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.weekTaskPlacement.findMany({
      where: { userId, weekColumnId: column.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.task.findMany({ where: { userId }, orderBy: { kanbanOrder: 'asc' } }),
    prisma.taskColumn.findMany({
      where: { userId },
      select: { id: true, legacyKey: true },
    }),
  ]);

  const allowed = allowedPlacementTaskIds(
    taskRows.map((task) => ({ ...task, userId })),
    columnRows,
    column.id,
    userId
  );

  return {
    column: mapColumn(column),
    localTasks: localRows.map(mapLocalTask),
    placements: placementRows
      .filter((row) => allowed.has(row.taskId))
      .map(mapPlacement),
    tasks: taskRows.filter((task) => allowed.has(task.id)).map(mapBoardTask),
  };
}

async function nextSortOrder(userId: string, weekColumnId: string, plannedDate: Date | null) {
  const where = { userId, weekColumnId, plannedDate };
  const [localMax, placementMax] = await Promise.all([
    prisma.weekLocalTask.aggregate({ where, _max: { sortOrder: true } }),
    prisma.weekTaskPlacement.aggregate({ where, _max: { sortOrder: true } }),
  ]);
  return Math.max(localMax._max.sortOrder ?? -1, placementMax._max.sortOrder ?? -1) + 1;
}

export async function createWeekLocalTask(
  userId: string,
  columnId: string,
  input: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    plannedDate?: string | null;
    sortOrder?: number;
  }
) {
  const column = await ownedWeek(userId, columnId, true);
  const title = input.title?.trim() ?? '';
  if (!title) throw new WeekBoardError('Title is required', 400);
  if (title.length > 200) throw new WeekBoardError('Title is too long', 400);
  if (input.priority && !PRIORITIES.has(input.priority as TaskPriority)) {
    throw new WeekBoardError('Invalid priority', 400);
  }
  if (input.status && !WEEK_LOCAL_STATUSES.includes(input.status as WeekLocalStatus)) {
    throw new WeekBoardError('Invalid status', 400);
  }

  const plannedDate = plannedDateOf(input.plannedDate);
  const sortOrder =
    typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)
      ? Math.max(0, Math.floor(input.sortOrder))
      : await nextSortOrder(userId, column.id, plannedDate);

  const row = await prisma.weekLocalTask.create({
    data: {
      userId,
      weekColumnId: column.id,
      title,
      description: input.description?.trim().slice(0, 4000) ?? '',
      plannedDate,
      priority: priorityOf(input.priority),
      status: statusOf(input.status),
      sortOrder,
    },
  });
  return mapLocalTask(row);
}

export async function updateWeekLocalTask(
  userId: string,
  columnId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    plannedDate?: string | null;
    sortOrder?: number;
  }
) {
  await ownedWeek(userId, columnId, true);
  const existing = await prisma.weekLocalTask.findFirst({
    where: { id: taskId, userId, weekColumnId: columnId },
  });
  if (!existing) throw new WeekBoardError('Local task not found', 404);

  const data: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    plannedDate?: Date | null;
    sortOrder?: number;
  } = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new WeekBoardError('Title is required', 400);
    if (title.length > 200) throw new WeekBoardError('Title is too long', 400);
    data.title = title;
  }
  if (input.description !== undefined) data.description = input.description.trim().slice(0, 4000);
  if (input.priority !== undefined) {
    if (!PRIORITIES.has(input.priority as TaskPriority)) throw new WeekBoardError('Invalid priority', 400);
    data.priority = input.priority;
  }
  if (input.status !== undefined) {
    if (!isWeekLocalStatus(input.status)) throw new WeekBoardError('Invalid status', 400);
    data.status = input.status;
  }
  if (input.plannedDate !== undefined) data.plannedDate = plannedDateOf(input.plannedDate);
  if (typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)) {
    data.sortOrder = Math.max(0, Math.floor(input.sortOrder));
  }

  const row = await prisma.weekLocalTask.update({ where: { id: existing.id }, data });
  return mapLocalTask(row);
}

export async function deleteWeekLocalTask(userId: string, columnId: string, taskId: string) {
  await ownedWeek(userId, columnId, true);
  const existing = await prisma.weekLocalTask.findFirst({
    where: { id: taskId, userId, weekColumnId: columnId },
    select: { id: true },
  });
  if (!existing) throw new WeekBoardError('Local task not found', 404);
  await prisma.weekLocalTask.delete({ where: { id: existing.id } });
}

export async function saveWeekLayout(userId: string, columnId: string, patch: WeekLayoutPatch) {
  const column = await ownedWeek(userId, columnId, true);
  const [taskRows, columnRows] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      select: { id: true, userId: true, columnId: true, type: true },
    }),
    prisma.taskColumn.findMany({
      where: { userId },
      select: { id: true, legacyKey: true },
    }),
  ]);
  const allowed = allowedPlacementTaskIds(taskRows, columnRows, column.id, userId);
  const localIds = patch.localTasks.map((item) => item.id);
  const ownedLocal = new Set(
    (
      await prisma.weekLocalTask.findMany({
        where: { userId, weekColumnId: column.id, id: { in: localIds } },
        select: { id: true },
      })
    ).map((item) => item.id)
  );

  await prisma.$transaction(async (tx) => {
    for (const item of patch.localTasks) {
      if (!ownedLocal.has(item.id)) continue;
      await tx.weekLocalTask.update({
        where: { id: item.id },
        data: {
          plannedDate: plannedDateOf(item.plannedDate),
          sortOrder: finiteSortOrder(item.sortOrder),
        },
      });
    }

    for (const item of patch.placements) {
      if (!allowed.has(item.taskId)) continue;
      const data: { plannedDate: Date | null; sortOrder: number } = {
        plannedDate: plannedDateOf(item.plannedDate),
        sortOrder: finiteSortOrder(item.sortOrder),
      };
      await tx.weekTaskPlacement.upsert({
        where: { taskId_weekColumnId: { taskId: item.taskId, weekColumnId: column.id } },
        create: { userId, taskId: item.taskId, weekColumnId: column.id, ...data },
        update: data,
      });
    }
  });
}
