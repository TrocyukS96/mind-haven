import { getDefaultItemTypes, SYSTEM_ITEM_TYPE_KEYS } from '@/shared/config/item-types';
import { prisma } from '@/shared/lib/db';

const BACKLOG_TITLE = 'Backlog';

const SYSTEM_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
};

export async function ensureTaskColumnsForUser(userId: string): Promise<void> {
  const existing = await prisma.taskColumn.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    await backfillColumnIds(userId);
    return;
  }

  const [itemTypeRows, layout, taskTypes] = await Promise.all([
    prisma.itemType.findMany({
      where: { section: 'tasks' },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.plannerLayout.findUnique({
      where: { userId },
      select: { tasksKanbanColumnOrder: true },
    }),
    prisma.task.findMany({
      where: { userId },
      select: { type: true },
      distinct: ['type'],
    }),
  ]);

  const keysInOrder: string[] = [];
  const seen = new Set<string>();

  const layoutOrder = Array.isArray(layout?.tasksKanbanColumnOrder)
    ? (layout.tasksKanbanColumnOrder as string[])
    : [];

  for (const key of layoutOrder) {
    if (typeof key === 'string' && key && !seen.has(key)) {
      seen.add(key);
      keysInOrder.push(key);
    }
  }

  if (itemTypeRows.length > 0) {
    for (const row of itemTypeRows) {
      if (!seen.has(row.key)) {
        seen.add(row.key);
        keysInOrder.push(row.key);
      }
    }
  } else {
    for (const key of getDefaultItemTypes().tasks.map((t) => t.key)) {
      if (!seen.has(key)) {
        seen.add(key);
        keysInOrder.push(key);
      }
    }
  }

  for (const row of taskTypes) {
    const key = row.type?.trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      keysInOrder.push(key);
    }
  }

  if (!seen.has('backlog')) {
    keysInOrder.unshift('backlog');
  }

  const labelByKey = new Map<string, string>();
  for (const row of itemTypeRows) {
    if (row.label) {
      labelByKey.set(row.key, row.label);
    }
  }

  await prisma.$transaction(async (tx) => {
    const columnIdByLegacy = new Map<string, string>();

    for (let index = 0; index < keysInOrder.length; index++) {
      const legacyKey = keysInOrder[index];
      const isSystem = (SYSTEM_ITEM_TYPE_KEYS as readonly string[]).includes(legacyKey);
      const title = labelByKey.get(legacyKey) || SYSTEM_LABELS[legacyKey] || legacyKey;

      const column = await tx.taskColumn.create({
        data: {
          userId,
          title: legacyKey === 'backlog' ? BACKLOG_TITLE : title.slice(0, 80),
          kind: isSystem ? 'default' : 'custom',
          legacyKey,
          sortOrder: index,
        },
      });
      columnIdByLegacy.set(legacyKey, column.id);
    }

    const backlogColumnId = columnIdByLegacy.get('backlog');
    const tasks = await tx.task.findMany({
      where: { userId },
      select: { id: true, type: true, columnId: true },
    });

    for (const task of tasks) {
      const legacyKey = task.type || 'backlog';
      const columnId = columnIdByLegacy.get(legacyKey) ?? backlogColumnId;
      if (columnId && task.columnId !== columnId) {
        await tx.task.update({
          where: { id: task.id },
          data: { columnId },
        });
      }
    }
  });
}

async function backfillColumnIds(userId: string): Promise<void> {
  const columns = await prisma.taskColumn.findMany({
    where: { userId, archivedAt: null },
    select: { id: true, legacyKey: true },
  });

  const byLegacy = new Map<string, string>();
  let backlogId: string | undefined;
  for (const col of columns) {
    if (col.legacyKey) {
      byLegacy.set(col.legacyKey, col.id);
    }
    if (col.legacyKey === 'backlog') {
      backlogId = col.id;
    }
  }

  if (!backlogId) {
    const backlog = columns.find((c) => c.legacyKey === 'backlog');
    backlogId = backlog?.id;
  }

  const tasks = await prisma.task.findMany({
    where: { userId, columnId: null },
    select: { id: true, type: true },
  });

  if (tasks.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const task of tasks) {
      const legacyKey = task.type || 'backlog';
      const columnId = byLegacy.get(legacyKey) ?? backlogId;
      if (!columnId) continue;
      await tx.task.update({
        where: { id: task.id },
        data: { columnId },
      });
    }
  });
}

export async function getBacklogColumnId(userId: string): Promise<string> {
  let column = await prisma.taskColumn.findFirst({
    where: { userId, legacyKey: 'backlog', archivedAt: null },
    select: { id: true },
  });

  if (!column) {
    await ensureTaskColumnsForUser(userId);
    column = await prisma.taskColumn.findFirst({
      where: { userId, legacyKey: 'backlog', archivedAt: null },
      select: { id: true },
    });
  }

  if (!column) {
    throw new Error('Backlog column not found');
  }

  return column.id;
}