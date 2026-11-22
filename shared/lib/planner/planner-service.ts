import { randomUUID } from 'node:crypto';
import type { Goal } from '@/entities/goal/model/types';
import type { Task, TaskPriority } from '@/entities/task/model/types';
import { getGoalCategoryFromDeadline } from '@/entities/goal/lib/get-goal-category-from-deadline';
import { prisma } from '@/shared/lib/db';
import { ensureTaskColumnsForUser } from '@/shared/lib/planner/column-migration';
import {
  calculateCompletionProgress,
  tasksForGoalProgress,
} from '@/shared/lib/planner/calculate-progress';
import { listProjects, listUserProjectNotes, refreshProjectProgress } from '@/shared/lib/planner/project-service';
import {
  listTaskColumns,
  ownedColumnId,
  ownedProjectId,
} from '@/shared/lib/planner/task-column-service';
import { isGoalStepTask } from '@/shared/lib/planner/goal-tasks';
import {
  normalizeColumnOrder,
  planPlannerSync,
  sanitizeGoal,
  sanitizeTask,
  type PlannerData,
  type PlannerSnapshot,
} from '@/shared/lib/planner/planner-merge';

const PRIORITIES = new Set<TaskPriority>(['low', 'medium', 'high', 'urgent']);
const CATEGORIES = new Set<Goal['category']>(['week', 'month', 'year']);
const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

interface IdOwner {
  userId: string;
}

export type { PlannerData, PlannerSnapshot };

function mapTask(row: {
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
    priority: PRIORITIES.has(row.priority as TaskPriority) ? (row.priority as TaskPriority) : 'medium',
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
  };
}

function mapGoal(
  row: {
    id: string;
    title: string;
    description: string;
    progress: number;
    deadline: Date;
    category: string;
    type: string;
    priority: string;
    kanbanOrder: number;
  },
  tasks: Task[]
): Goal {
  const deadline = row.deadline.toISOString();
  const category = CATEGORIES.has(row.category as Goal['category'])
    ? (row.category as Goal['category'])
    : getGoalCategoryFromDeadline(deadline);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    progress: row.progress,
    deadline,
    category,
    type: row.type,
    priority: PRIORITIES.has(row.priority as TaskPriority) ? (row.priority as TaskPriority) : 'medium',
    kanbanOrder: row.kanbanOrder,
    tasks,
  };
}

async function resolveId(
  requestedId: string,
  userId: string,
  findOwner: (id: string) => Promise<IdOwner | null>
): Promise<string> {
  const safeId = SAFE_ID.test(requestedId) ? requestedId : randomUUID();
  const owner = await findOwner(safeId);
  if (!owner || owner.userId === userId) return safeId;
  return randomUUID();
}

async function ownedGoalId(userId: string, goalId?: string | null): Promise<string | null> {
  if (!goalId) return null;
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  });
  return goal?.id ?? null;
}

export async function refreshGoalProgress(userId: string, goalId?: string | null): Promise<void> {
  if (!goalId) return;

  const [taskRows, projectRows] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        goalId: true,
        projectId: true,
        completed: true,
      },
    }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, goalId: true },
    }),
  ]);

  const projectGoalIds = new Map(projectRows.map((p) => [p.id, p.goalId]));
  const relevant = tasksForGoalProgress(
    taskRows.map((t) => ({
      id: t.id,
      title: '',
      completed: t.completed,
      priority: 'medium' as const,
      type: 'backlog',
      goalId: t.goalId ?? undefined,
      projectId: t.projectId ?? undefined,
      createdAt: new Date().toISOString(),
    })),
    goalId,
    projectGoalIds
  );

  await prisma.goal.updateMany({
    where: { id: goalId, userId },
    data: { progress: calculateCompletionProgress(relevant) },
  });
}

function goalData(goal: Goal) {
  return {
    title: goal.title,
    description: goal.description,
    progress: goal.progress,
    deadline: new Date(goal.deadline),
    category: goal.category,
    type: goal.type,
    priority: goal.priority,
    kanbanOrder: goal.kanbanOrder ?? 0,
  };
}

async function resolveColumnIdForType(userId: string, type: string): Promise<string | null> {
  const column = await prisma.taskColumn.findFirst({
    where: { userId, legacyKey: type, archivedAt: null },
    select: { id: true },
  });
  return column?.id ?? null;
}

async function resolveTaskRelations(
  userId: string,
  task: Task,
  fallback?: { goalId?: string | null; projectId?: string | null; columnId?: string | null }
): Promise<{ goalId: string | null; projectId: string | null; columnId: string | null }> {
  const goalId = await ownedGoalId(
    userId,
    task.goalId !== undefined ? task.goalId : fallback?.goalId
  );
  const projectId = await ownedProjectId(
    userId,
    task.projectId !== undefined ? task.projectId : fallback?.projectId
  );

  let columnId = await ownedColumnId(
    userId,
    task.columnId !== undefined ? task.columnId : fallback?.columnId
  );

  if (!columnId) {
    columnId = await resolveColumnIdForType(userId, task.type);
  }

  return { goalId, projectId, columnId };
}

function buildTaskData(
  task: Task,
  goalId: string | null,
  projectId: string | null,
  columnId: string | null
) {
  return {
    goalId,
    projectId,
    columnId,
    title: task.title,
    description: task.description ?? '',
    completed: task.completed,
    priority: task.priority,
    type: task.type,
    kanbanOrder: task.kanbanOrder ?? 0,
    estimatedMinutes:
      task.estimatedMinutes !== undefined ? Math.max(0, Math.round(task.estimatedMinutes)) : null,
    createdAt: new Date(task.createdAt),
    completedAt: task.completedAt ? new Date(task.completedAt) : null,
    deadline: task.deadline ? new Date(task.deadline) : null,
    overdue: Boolean(task.overdue),
  };
}

export async function getPlanner(userId: string): Promise<PlannerData> {
  await ensureTaskColumnsForUser(userId);

  const [goalRows, taskRows, layout, projects, taskColumns, projectNotes] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.plannerLayout.findUnique({ where: { userId } }),
    listProjects(userId),
    listTaskColumns(userId),
    listUserProjectNotes(userId),
  ]);

  const tasks = taskRows.map(mapTask);
  const projectGoalIds = new Map(
    (await prisma.project.findMany({ where: { userId }, select: { id: true, goalId: true } })).map(
      (p) => [p.id, p.goalId]
    )
  );

  const tasksByGoal = new Map<string, Task[]>();

  for (const task of tasks) {
    if (!task.goalId) continue;
    if (task.projectId && projectGoalIds.get(task.projectId) === task.goalId) {
      continue;
    }
    const grouped = tasksByGoal.get(task.goalId) ?? [];
    grouped.push(task);
    tasksByGoal.set(task.goalId, grouped);
  }

  const columnOrder =
    taskColumns.length > 0
      ? taskColumns.map((c) => c.legacyKey ?? c.id).filter(Boolean)
      : normalizeColumnOrder(layout?.tasksKanbanColumnOrder);

  return {
    goals: goalRows.map((row) => mapGoal(row, tasksByGoal.get(row.id) ?? [])),
    tasks,
    projects,
    projectNotes,
    taskColumns,
    goalsKanbanColumnOrder: normalizeColumnOrder(layout?.goalsKanbanColumnOrder),
    tasksKanbanColumnOrder: columnOrder,
  };
}

export async function createGoal(userId: string, input: Goal): Promise<Goal> {
  const sanitized = sanitizeGoal(input);
  if (!sanitized) {
    throw new Error('Goal is invalid');
  }

  const id = await resolveId(sanitized.id, userId, (goalId) =>
    prisma.goal.findUnique({ where: { id: goalId }, select: { userId: true } })
  );

  const row = await prisma.goal.create({
    data: { id, userId, ...goalData(sanitized) },
  });

  return mapGoal(row, []);
}

export async function updateGoal(userId: string, goalId: string, input: Partial<Goal>): Promise<Goal> {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) {
    throw new Error('Goal not found');
  }

  const current = mapGoal(existing, []);
  const sanitized = sanitizeGoal({ ...current, ...input, id: goalId, tasks: input.tasks ?? current.tasks });
  if (!sanitized) {
    throw new Error('Goal is invalid');
  }

  const row = await prisma.goal.update({
    where: { id: goalId },
    data: goalData(sanitized),
  });
  const tasks = await prisma.task.findMany({ where: { userId, goalId }, orderBy: { createdAt: 'asc' } });
  return mapGoal(row, tasks.map(mapTask));
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } });
  if (!existing) {
    throw new Error('Goal not found');
  }

  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: { userId, goalId },
      select: { id: true, goalId: true, projectId: true },
    }),
    prisma.project.findMany({
      where: { userId, goalId },
      select: { id: true, goalId: true },
    }),
  ]);
  const stepIds = tasks.filter((task) => isGoalStepTask(task, goalId, projects)).map((task) => task.id);
  const affectedProjectIds = [
    ...new Set(
      tasks
        .filter((task) => stepIds.includes(task.id) && task.projectId)
        .map((task) => task.projectId as string)
    ),
  ];

  await prisma.$transaction(async (tx) => {
    if (stepIds.length > 0) {
      await tx.task.deleteMany({ where: { userId, id: { in: stepIds } } });
    }

    await tx.goal.delete({ where: { id: goalId } });
  });

  await Promise.all(affectedProjectIds.map((projectId) => refreshProjectProgress(userId, projectId)));
}

export async function createTask(userId: string, input: Task): Promise<Task> {
  const relations = await resolveTaskRelations(userId, input);
  const sanitized = sanitizeTask({
    ...input,
    goalId: relations.goalId ?? undefined,
    projectId: relations.projectId ?? undefined,
    columnId: relations.columnId ?? undefined,
  });
  if (!sanitized) {
    throw new Error('Task is invalid');
  }

  const id = await resolveId(sanitized.id, userId, (taskId) =>
    prisma.task.findUnique({ where: { id: taskId }, select: { userId: true } })
  );

  const row = await prisma.task.create({
    data: {
      id,
      userId,
      ...buildTaskData(sanitized, relations.goalId, relations.projectId, relations.columnId),
    },
  });

  await Promise.all([
    refreshGoalProgress(userId, relations.goalId),
    refreshProjectProgress(userId, relations.projectId),
  ]);
  return mapTask(row);
}

export async function updateTask(userId: string, taskId: string, input: Partial<Task>): Promise<Task> {
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) {
    throw new Error('Task not found');
  }

  const merged = { ...mapTask(existing), ...input, id: taskId };
  const relations = await resolveTaskRelations(userId, merged, existing);
  const sanitized = sanitizeTask({
    ...merged,
    goalId: relations.goalId ?? undefined,
    projectId: relations.projectId ?? undefined,
    columnId: relations.columnId ?? undefined,
  });
  if (!sanitized) {
    throw new Error('Task is invalid');
  }

  const row = await prisma.task.update({
    where: { id: taskId },
    data: buildTaskData(sanitized, relations.goalId, relations.projectId, relations.columnId),
  });

  const completedChanged = existing.completed !== sanitized.completed;
  const goalChanged = existing.goalId !== relations.goalId;
  const projectChanged = existing.projectId !== relations.projectId;

  if (completedChanged || goalChanged || projectChanged) {
    await Promise.all([
      refreshGoalProgress(userId, existing.goalId),
      relations.goalId !== existing.goalId
        ? refreshGoalProgress(userId, relations.goalId)
        : Promise.resolve(),
      refreshProjectProgress(userId, existing.projectId),
      relations.projectId !== existing.projectId
        ? refreshProjectProgress(userId, relations.projectId)
        : Promise.resolve(),
    ]);
  }

  return mapTask(row);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true, goalId: true, projectId: true },
  });

  if (!existing) {
    throw new Error('Task not found');
  }

  await prisma.task.delete({ where: { id: taskId } });
  await Promise.all([
    refreshGoalProgress(userId, existing.goalId),
    refreshProjectProgress(userId, existing.projectId),
  ]);
}

export async function reorderPlanner(
  userId: string,
  input: {
    goals?: { id: string; type: string; kanbanOrder: number }[];
    tasks?: { id: string; type: string; kanbanOrder: number; columnId?: string | null }[];
  }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const goal of input.goals ?? []) {
      const type = goal.type?.trim().slice(0, 40);
      if (!goal.id || !type || !/^[A-Za-z0-9_-]+$/.test(type)) continue;
      await tx.goal.updateMany({
        where: { id: goal.id, userId },
        data: { type, kanbanOrder: Math.max(0, Math.round(goal.kanbanOrder || 0)) },
      });
    }

    const columns = await tx.taskColumn.findMany({
      where: { userId },
      select: { id: true, legacyKey: true, archivedAt: true },
    });
    const columnsById = new Map(columns.map((column) => [column.id, column]));
    const legacyToColumn = new Map(
      columns
        .filter((column) => column.legacyKey && !column.archivedAt)
        .map((column) => [column.legacyKey as string, column.id])
    );

    for (const task of input.tasks ?? []) {
      const type = task.type?.trim().slice(0, 40);
      if (!task.id || !type || !/^[A-Za-z0-9_-]+$/.test(type)) continue;
      const explicitColumn = task.columnId ? columnsById.get(task.columnId) : undefined;
      const columnId = explicitColumn?.id ?? legacyToColumn.get(type) ?? null;
      await tx.task.updateMany({
        where: { id: task.id, userId },
        data: {
          type,
          columnId,
          kanbanOrder: Math.max(0, Math.round(task.kanbanOrder || 0)),
        },
      });
    }
  });
}

export async function savePlannerLayout(
  userId: string,
  input: { goalsKanbanColumnOrder?: string[]; tasksKanbanColumnOrder?: string[] }
): Promise<PlannerData> {
  const current = await prisma.plannerLayout.findUnique({ where: { userId } });

  await prisma.plannerLayout.upsert({
    where: { userId },
    create: {
      userId,
      goalsKanbanColumnOrder: normalizeColumnOrder(input.goalsKanbanColumnOrder),
      tasksKanbanColumnOrder: normalizeColumnOrder(input.tasksKanbanColumnOrder),
    },
    update: {
      goalsKanbanColumnOrder:
        input.goalsKanbanColumnOrder === undefined
          ? normalizeColumnOrder(current?.goalsKanbanColumnOrder)
          : normalizeColumnOrder(input.goalsKanbanColumnOrder),
      tasksKanbanColumnOrder:
        input.tasksKanbanColumnOrder === undefined
          ? normalizeColumnOrder(current?.tasksKanbanColumnOrder)
          : normalizeColumnOrder(input.tasksKanbanColumnOrder),
    },
  });

  return getPlanner(userId);
}

export async function syncPlannerFromBrowser(userId: string, snapshot: PlannerSnapshot): Promise<PlannerData> {
  const current = await getPlanner(userId);
  const plan = planPlannerSync(
    {
      goalIds: current.goals.map((goal) => goal.id),
      taskIds: current.tasks.map((task) => task.id),
      goalsKanbanColumnOrder: current.goalsKanbanColumnOrder,
      tasksKanbanColumnOrder: current.tasksKanbanColumnOrder,
    },
    {
      goals: snapshot.goals ?? [],
      tasks: snapshot.tasks ?? [],
      goalsKanbanColumnOrder: snapshot.goalsKanbanColumnOrder ?? [],
      tasksKanbanColumnOrder: snapshot.tasksKanbanColumnOrder ?? [],
      outbox: snapshot.outbox ?? [],
    }
  );

  await prisma.$transaction(
    async (tx) => {
      const goalIdMap = new Map<string, string>();

      for (const goal of plan.goalUpserts) {
        const sanitized = sanitizeGoal(goal);
        if (!sanitized) continue;

        const id = await resolveId(sanitized.id, userId, (goalId) =>
          tx.goal.findUnique({ where: { id: goalId }, select: { userId: true } })
        );
        goalIdMap.set(sanitized.id, id);
        const data = goalData(sanitized);
        const existing = await tx.goal.findFirst({ where: { id, userId }, select: { id: true } });

        if (existing) {
          await tx.goal.update({ where: { id }, data });
        } else {
          await tx.goal.create({ data: { id, userId, ...data } });
        }
      }

      const validGoalIds = new Set<string>([
        ...current.goals.map((goal) => goal.id).filter((id) => !plan.goalDeletes.includes(id)),
        ...goalIdMap.values(),
      ]);

      for (const task of plan.taskUpserts) {
        const mappedGoalId = task.goalId ? (goalIdMap.get(task.goalId) ?? task.goalId) : undefined;
        const sanitized = sanitizeTask({ ...task, goalId: mappedGoalId }, validGoalIds);
        if (!sanitized) continue;

        const id = await resolveId(sanitized.id, userId, (taskId) =>
          tx.task.findUnique({ where: { id: taskId }, select: { userId: true } })
        );
        const goalId = sanitized.goalId ?? null;
        let projectId: string | null = sanitized.projectId ?? null;
        if (projectId) {
          const project = await tx.project.findFirst({
            where: { id: projectId, userId },
            select: { id: true },
          });
          projectId = project?.id ?? null;
        }

        let columnId: string | null = sanitized.columnId ?? null;
        if (columnId) {
          const column = await tx.taskColumn.findFirst({
            where: { id: columnId, userId },
            select: { id: true },
          });
          columnId = column?.id ?? null;
        }
        if (!columnId) {
          const column = await tx.taskColumn.findFirst({
            where: { userId, legacyKey: sanitized.type, archivedAt: null },
            select: { id: true },
          });
          columnId = column?.id ?? null;
        }

        const data = buildTaskData(sanitized, goalId, projectId, columnId);
        const existing = await tx.task.findFirst({ where: { id, userId }, select: { id: true } });

        if (existing) {
          await tx.task.update({ where: { id }, data });
        } else {
          await tx.task.create({ data: { id, userId, ...data } });
        }
      }

      if (plan.taskDeletes.length > 0) {
        await tx.task.deleteMany({ where: { userId, id: { in: plan.taskDeletes } } });
      }

      if (plan.goalDeletes.length > 0) {
        await tx.goal.deleteMany({ where: { userId, id: { in: plan.goalDeletes } } });
      }

      if (plan.writeLayout) {
        await tx.plannerLayout.upsert({
          where: { userId },
          create: {
            userId,
            goalsKanbanColumnOrder: plan.goalsKanbanColumnOrder,
            tasksKanbanColumnOrder: plan.tasksKanbanColumnOrder,
          },
          update: {
            goalsKanbanColumnOrder: plan.goalsKanbanColumnOrder,
            tasksKanbanColumnOrder: plan.tasksKanbanColumnOrder,
          },
        });
      }
    },
    { timeout: 20000 }
  );

  const remoteTasks = new Map(current.tasks.map((task) => [task.id, task]));
  const touchedGoalIds = new Set<string>();

  for (const task of plan.taskUpserts) {
    const previous = remoteTasks.get(task.id);
    if (previous && previous.completed === Boolean(task.completed) && previous.goalId === task.goalId) {
      continue;
    }

    if (task.goalId) touchedGoalIds.add(task.goalId);
    if (previous?.goalId) touchedGoalIds.add(previous.goalId);
  }

  for (const taskId of plan.taskDeletes) {
    const previous = remoteTasks.get(taskId);
    if (previous?.goalId) touchedGoalIds.add(previous.goalId);
  }

  const upsertedGoalIds = new Set(plan.goalUpserts.map((goal) => goal.id));

  for (const goalId of touchedGoalIds) {
    if (plan.goalDeletes.includes(goalId) || upsertedGoalIds.has(goalId)) continue;
    await refreshGoalProgress(userId, goalId);
  }

  return getPlanner(userId);
}
