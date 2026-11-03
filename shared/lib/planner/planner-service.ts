import { randomUUID } from 'node:crypto';
import type { Goal } from '@/entities/goal/model/types';
import type { Task, TaskPriority } from '@/entities/task/model/types';
import { getGoalCategoryFromDeadline } from '@/entities/goal/lib/get-goal-category-from-deadline';
import { prisma } from '@/shared/lib/db';
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

function calculateProgress(tasks: { completed: boolean }[]): number {
  if (tasks.length === 0) return 0;
  return Math.round(tasks.reduce((total, task) => total + (task.completed ? 100 : 20), 0) / tasks.length);
}

function mapTask(row: {
  id: string;
  goalId: string | null;
  title: string;
  description: string;
  completed: boolean;
  priority: string;
  type: string;
  kanbanOrder: number;
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

async function refreshGoalProgress(userId: string, goalId?: string | null): Promise<void> {
  if (!goalId) return;

  const tasks = await prisma.task.findMany({
    where: { userId, goalId },
    select: { completed: true },
  });

  await prisma.goal.updateMany({
    where: { id: goalId, userId },
    data: { progress: calculateProgress(tasks) },
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

function taskData(task: Task, goalId: string | null) {
  return {
    goalId,
    title: task.title,
    description: task.description ?? '',
    completed: task.completed,
    priority: task.priority,
    type: task.type,
    kanbanOrder: task.kanbanOrder ?? 0,
    createdAt: new Date(task.createdAt),
    completedAt: task.completedAt ? new Date(task.completedAt) : null,
    deadline: task.deadline ? new Date(task.deadline) : null,
    overdue: Boolean(task.overdue),
  };
}

export async function getPlanner(userId: string): Promise<PlannerData> {
  const [goalRows, taskRows, layout] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.plannerLayout.findUnique({ where: { userId } }),
  ]);

  const tasks = taskRows.map(mapTask);
  const tasksByGoal = new Map<string, Task[]>();

  for (const task of tasks) {
    if (!task.goalId) continue;
    const grouped = tasksByGoal.get(task.goalId) ?? [];
    grouped.push(task);
    tasksByGoal.set(task.goalId, grouped);
  }

  return {
    goals: goalRows.map((row) => mapGoal(row, tasksByGoal.get(row.id) ?? [])),
    tasks,
    goalsKanbanColumnOrder: normalizeColumnOrder(layout?.goalsKanbanColumnOrder),
    tasksKanbanColumnOrder: normalizeColumnOrder(layout?.tasksKanbanColumnOrder),
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

  await prisma.goal.delete({ where: { id: goalId } });
}

export async function createTask(userId: string, input: Task): Promise<Task> {
  const goalId = await ownedGoalId(userId, input.goalId);
  const sanitized = sanitizeTask({ ...input, goalId: goalId ?? undefined });
  if (!sanitized) {
    throw new Error('Task is invalid');
  }

  const id = await resolveId(sanitized.id, userId, (taskId) =>
    prisma.task.findUnique({ where: { id: taskId }, select: { userId: true } })
  );

  const row = await prisma.task.create({
    data: { id, userId, ...taskData(sanitized, goalId) },
  });

  await refreshGoalProgress(userId, goalId);
  return mapTask(row);
}

export async function updateTask(userId: string, taskId: string, input: Partial<Task>): Promise<Task> {
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) {
    throw new Error('Task not found');
  }

  const goalId = await ownedGoalId(userId, input.goalId === undefined ? existing.goalId : input.goalId);
  const sanitized = sanitizeTask({ ...mapTask(existing), ...input, id: taskId, goalId: goalId ?? undefined });
  if (!sanitized) {
    throw new Error('Task is invalid');
  }

  const row = await prisma.task.update({
    where: { id: taskId },
    data: taskData(sanitized, goalId),
  });

  const completedChanged = existing.completed !== sanitized.completed;
  const goalChanged = existing.goalId !== goalId;
  if (completedChanged || goalChanged || input.goalId !== undefined) {
    if (completedChanged || goalChanged) {
      await refreshGoalProgress(userId, existing.goalId);
      if (goalId !== existing.goalId) {
        await refreshGoalProgress(userId, goalId);
      }
    }
  }

  return mapTask(row);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true, goalId: true },
  });

  if (!existing) {
    throw new Error('Task not found');
  }

  await prisma.task.delete({ where: { id: taskId } });
  await refreshGoalProgress(userId, existing.goalId);
}

export async function reorderPlanner(
  userId: string,
  input: {
    goals?: { id: string; type: string; kanbanOrder: number }[];
    tasks?: { id: string; type: string; kanbanOrder: number }[];
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

    for (const task of input.tasks ?? []) {
      const type = task.type?.trim().slice(0, 40);
      if (!task.id || !type || !/^[A-Za-z0-9_-]+$/.test(type)) continue;
      await tx.task.updateMany({
        where: { id: task.id, userId },
        data: { type, kanbanOrder: Math.max(0, Math.round(task.kanbanOrder || 0)) },
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
        const data = taskData(sanitized, goalId);
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
