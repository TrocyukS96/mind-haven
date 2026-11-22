import type { TaskColumn, TaskColumnKind } from '@/entities/task-column/model/types';
import { prisma } from '@/shared/lib/db';
import { ensureTaskColumnsForUser, getBacklogColumnId } from '@/shared/lib/planner/column-migration';

const KINDS = new Set<TaskColumnKind>(['default', 'custom', 'week']);

export function mapColumn(row: {
  id: string;
  title: string;
  kind: string;
  legacyKey: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  sortOrder: number;
  isHidden: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TaskColumn {
  return {
    id: row.id,
    title: row.title,
    kind: KINDS.has(row.kind as TaskColumnKind) ? (row.kind as TaskColumnKind) : 'custom',
    legacyKey: row.legacyKey ?? undefined,
    dateFrom: row.dateFrom?.toISOString(),
    dateTo: row.dateTo?.toISOString(),
    sortOrder: row.sortOrder,
    isHidden: row.isHidden,
    archivedAt: row.archivedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function taskColumnErrorStatus(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'WEEK_RANGE_OVERLAP':
      return { status: 409, message: 'Week range overlaps with existing week' };
    case 'INVALID_RANGE':
      return { status: 400, message: 'Invalid week range' };
    case 'CANNOT_ARCHIVE_BACKLOG':
      return { status: 400, message: 'Cannot archive backlog column' };
    case 'CANNOT_DELETE_BACKLOG':
      return { status: 400, message: 'Cannot delete backlog column' };
    case 'Cannot rename backlog column':
      return { status: 400, message: error.message };
    case 'Column not found':
    case 'Target column not found':
      return { status: 404, message: error.message };
    default:
      return null;
  }
}

type ListOptions = {
  includeArchived?: boolean;
  archivedOnly?: boolean;
};

export async function listTaskColumns(
  userId: string,
  includeArchived: boolean | ListOptions = false
): Promise<TaskColumn[]> {
  const options: ListOptions =
    typeof includeArchived === 'boolean' ? { includeArchived } : includeArchived;
  const where = options.archivedOnly
    ? { userId, archivedAt: { not: null } }
    : options.includeArchived
      ? { userId }
      : { userId, archivedAt: null };

  const rows = await prisma.taskColumn.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(mapColumn);
}

async function ensureBacklogColumn(userId: string) {
  const existing = await prisma.taskColumn.findFirst({
    where: { userId, legacyKey: 'backlog', archivedAt: null },
    select: { id: true },
  });
  if (existing) return;

  await ensureTaskColumnsForUser(userId);
  const created = await prisma.taskColumn.findFirst({
    where: { userId, legacyKey: 'backlog', archivedAt: null },
    select: { id: true },
  });
  if (created) return;

  await prisma.taskColumn.create({
    data: {
      userId,
      title: 'Backlog',
      kind: 'default',
      legacyKey: 'backlog',
      sortOrder: 0,
    },
  });
}

async function assertWeekRangeAvailable(
  userId: string,
  dateFrom: Date,
  dateTo: Date,
  ignoreId?: string
) {
  if (dateFrom > dateTo) throw new Error('INVALID_RANGE');

  const overlap = await prisma.taskColumn.findFirst({
    where: {
      userId,
      kind: 'week',
      archivedAt: null,
      id: ignoreId ? { not: ignoreId } : undefined,
      dateFrom: { lte: dateTo },
      dateTo: { gte: dateFrom },
    },
  });
  if (overlap) throw new Error('WEEK_RANGE_OVERLAP');
}

export async function createTaskColumn(
  userId: string,
  input: {
    title: string;
    kind?: TaskColumnKind;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<TaskColumn> {
  const title = input.title.trim().slice(0, 80);
  if (!title) throw new Error('Column title is required');

  await ensureBacklogColumn(userId);

  const kind = input.kind && KINDS.has(input.kind) ? input.kind : 'custom';
  const dateFrom = input.dateFrom ? new Date(input.dateFrom) : null;
  const dateTo = input.dateTo ? new Date(input.dateTo) : null;
  if ((dateFrom && Number.isNaN(dateFrom.getTime())) || (dateTo && Number.isNaN(dateTo.getTime()))) {
    throw new Error('INVALID_RANGE');
  }
  if (kind === 'week' && (!dateFrom || !dateTo)) throw new Error('INVALID_RANGE');
  if (kind === 'week' && dateFrom && dateTo) {
    await assertWeekRangeAvailable(userId, dateFrom, dateTo);
  }

  const maxOrder = await prisma.taskColumn.aggregate({
    where: { userId, archivedAt: null },
    _max: { sortOrder: true },
  });

  const row = await prisma.taskColumn.create({
    data: {
      userId,
      title,
      kind,
      dateFrom,
      dateTo,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return mapColumn(row);
}

export async function updateTaskColumn(
  userId: string,
  columnId: string,
  input: Partial<Pick<TaskColumn, 'title' | 'sortOrder' | 'isHidden'>> & {
    dateFrom?: string | null;
    dateTo?: string | null;
    archivedAt?: string | null;
  }
): Promise<TaskColumn> {
  const existing = await prisma.taskColumn.findFirst({ where: { id: columnId, userId } });
  if (!existing) throw new Error('Column not found');

  if (existing.legacyKey === 'backlog' && input.title && input.title.trim() !== existing.title) {
    throw new Error('Cannot rename backlog column');
  }
  if (existing.legacyKey === 'backlog' && input.archivedAt) {
    throw new Error('CANNOT_ARCHIVE_BACKLOG');
  }

  const nextFrom =
    input.dateFrom === undefined ? existing.dateFrom : input.dateFrom ? new Date(input.dateFrom) : null;
  const nextTo =
    input.dateTo === undefined ? existing.dateTo : input.dateTo ? new Date(input.dateTo) : null;
  if ((nextFrom && Number.isNaN(nextFrom.getTime())) || (nextTo && Number.isNaN(nextTo.getTime()))) {
    throw new Error('INVALID_RANGE');
  }

  const restoring = input.archivedAt === null && existing.archivedAt !== null;
  const datesChanged = input.dateFrom !== undefined || input.dateTo !== undefined;
  const staysActive = input.archivedAt === undefined ? existing.archivedAt === null : input.archivedAt === null;

  if (existing.kind === 'week' && staysActive && (restoring || datesChanged) && nextFrom && nextTo) {
    await assertWeekRangeAvailable(userId, nextFrom, nextTo, columnId);
  }

  const title = input.title !== undefined ? input.title.trim().slice(0, 80) : undefined;
  if (title !== undefined && !title) throw new Error('Column title is required');

  const row = await prisma.taskColumn.update({
    where: { id: columnId },
    data: {
      title,
      sortOrder: input.sortOrder !== undefined ? Math.max(0, input.sortOrder) : undefined,
      dateFrom: input.dateFrom === undefined ? undefined : nextFrom,
      dateTo: input.dateTo === undefined ? undefined : nextTo,
      isHidden: input.isHidden === undefined ? undefined : Boolean(input.isHidden),
      archivedAt:
        input.archivedAt === undefined
          ? undefined
          : input.archivedAt
            ? new Date(input.archivedAt)
            : null,
    },
  });

  return mapColumn(row);
}

export async function reorderTaskColumns(userId: string, columnIds: string[]): Promise<void> {
  const owned = await prisma.taskColumn.findMany({
    where: { userId, archivedAt: null },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((column) => column.id));

  await prisma.$transaction(async (tx) => {
    let order = 0;
    for (const id of columnIds) {
      if (!ownedIds.has(id)) continue;
      await tx.taskColumn.update({
        where: { id },
        data: { sortOrder: order++ },
      });
    }

    for (const column of owned) {
      if (columnIds.includes(column.id)) continue;
      await tx.taskColumn.update({
        where: { id: column.id },
        data: { sortOrder: order++ },
      });
    }
  });
}

export async function deleteTaskColumn(
  userId: string,
  columnId: string,
  options?: { transferToColumnId?: string; deleteTasks?: boolean }
): Promise<{ goalIds: string[]; projectIds: string[] }> {
  const column = await prisma.taskColumn.findFirst({ where: { id: columnId, userId } });
  if (!column) throw new Error('Column not found');
  if (column.legacyKey === 'backlog') throw new Error('CANNOT_DELETE_BACKLOG');

  if (options?.deleteTasks) {
    const doomed = await prisma.task.findMany({
      where: { userId, columnId },
      select: { goalId: true, projectId: true },
    });
    await prisma.$transaction(async (tx) => {
      await tx.task.deleteMany({ where: { userId, columnId } });
      await tx.taskColumn.delete({ where: { id: columnId } });
    });
    return {
      goalIds: [...new Set(doomed.map((task) => task.goalId).filter((id): id is string => Boolean(id)))],
      projectIds: [
        ...new Set(doomed.map((task) => task.projectId).filter((id): id is string => Boolean(id))),
      ],
    };
  }

  const targetId = options?.transferToColumnId ?? (await getBacklogColumnId(userId));
  if (targetId === columnId) throw new Error('Target column not found');

  const target = await prisma.taskColumn.findFirst({
    where: { id: targetId, userId, archivedAt: null },
    select: { id: true, legacyKey: true },
  });
  if (!target) throw new Error('Target column not found');

  await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: { userId, columnId },
      data: target.legacyKey ? { columnId: targetId, type: target.legacyKey } : { columnId: targetId },
    });
    await tx.taskColumn.delete({ where: { id: columnId } });
  });

  return { goalIds: [], projectIds: [] };
}

export async function archiveTaskColumn(userId: string, columnId: string): Promise<TaskColumn> {
  return updateTaskColumn(userId, columnId, { archivedAt: new Date().toISOString() });
}

export async function moveTasksToColumn(
  userId: string,
  taskIds: string[],
  columnId: string
): Promise<void> {
  const column = await prisma.taskColumn.findFirst({
    where: { id: columnId, userId },
    select: { id: true, legacyKey: true },
  });
  if (!column) throw new Error('Column not found');

  await prisma.task.updateMany({
    where: { userId, id: { in: taskIds } },
    data: column.legacyKey ? { columnId, type: column.legacyKey } : { columnId },
  });
}

export async function createNextWeekColumn(
  userId: string,
  input?: { dateFrom?: string; dateTo?: string; title?: string }
): Promise<TaskColumn> {
  if (input?.dateFrom && input?.dateTo) {
    const from = new Date(input.dateFrom);
    const to = new Date(input.dateTo);
    const title =
      input.title?.trim() ||
      `${from.toLocaleDateString('ru-RU')}–${to.toLocaleDateString('ru-RU')}`;
    return createTaskColumn(userId, {
      title,
      kind: 'week',
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    });
  }

  const lastWeek = await prisma.taskColumn.findFirst({
    where: { userId, kind: 'week', archivedAt: null },
    orderBy: { dateTo: 'desc' },
  });

  let dateFrom: Date;
  let dateTo: Date;

  if (lastWeek?.dateTo) {
    dateFrom = new Date(lastWeek.dateTo);
    dateFrom.setDate(dateFrom.getDate() + 1);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo = new Date(dateFrom);
    dateTo.setDate(dateTo.getDate() + 6);
    dateTo.setHours(23, 59, 59, 999);
  } else {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    dateFrom = new Date(now);
    dateFrom.setDate(now.getDate() + diffToMonday + 7);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo = new Date(dateFrom);
    dateTo.setDate(dateFrom.getDate() + 6);
    dateTo.setHours(23, 59, 59, 999);
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return createTaskColumn(userId, {
    title: `${formatDate(dateFrom)}–${formatDate(dateTo)}`,
    kind: 'week',
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  });
}

export async function ownedColumnId(userId: string, columnId?: string | null): Promise<string | null> {
  if (!columnId) return null;
  const column = await prisma.taskColumn.findFirst({
    where: { id: columnId, userId, archivedAt: null },
    select: { id: true },
  });
  return column?.id ?? null;
}

export async function ownedProjectId(userId: string, projectId?: string | null): Promise<string | null> {
  if (!projectId) return null;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  return project?.id ?? null;
}
