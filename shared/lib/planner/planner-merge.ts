import type { Goal } from '@/entities/goal/model/types';
import { getGoalCategoryFromDeadline } from '@/entities/goal/lib/get-goal-category-from-deadline';
import type { Task, TaskPriority } from '@/entities/task/model/types';

const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;
const PRIORITIES = new Set<TaskPriority>(['low', 'medium', 'high', 'urgent']);
const CATEGORIES = new Set<Goal['category']>(['week', 'month', 'year']);

export interface PlannerOutboxItem {
  seq: number;
  key: string;
  kind: 'upsert-goal' | 'delete-goal' | 'upsert-task' | 'delete-task' | 'layout';
  entityId: string;
  goal?: Goal;
  task?: Task;
  goalsKanbanColumnOrder?: string[];
  tasksKanbanColumnOrder?: string[];
}

export interface PlannerSnapshot {
  goals: Goal[];
  tasks: Task[];
  goalsKanbanColumnOrder: string[];
  tasksKanbanColumnOrder: string[];
  outbox: PlannerOutboxItem[];
}

export interface PlannerData {
  goals: Goal[];
  tasks: Task[];
  goalsKanbanColumnOrder: string[];
  tasksKanbanColumnOrder: string[];
}

export interface PlannerSyncPlan {
  goalUpserts: Goal[];
  taskUpserts: Task[];
  goalDeletes: string[];
  taskDeletes: string[];
  goalsKanbanColumnOrder: string[];
  tasksKanbanColumnOrder: string[];
  writeLayout: boolean;
}

interface RemotePlannerIds {
  goalIds: string[];
  taskIds: string[];
  goalsKanbanColumnOrder: string[];
  tasksKanbanColumnOrder: string[];
}

export function normalizeColumnOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const order: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const key = item.trim();
    if (!key || key.length > 64 || seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }

  return order;
}

export function collectPlannerTasks(snapshot: { goals?: Goal[]; tasks?: Task[] }): Task[] {
  const byId = new Map<string, Task>();

  for (const task of snapshot.tasks ?? []) {
    if (!task?.id || !task.title?.trim()) continue;
    byId.set(task.id, task);
  }

  for (const goal of snapshot.goals ?? []) {
    for (const task of goal?.tasks ?? []) {
      if (!task?.id || !task.title?.trim() || byId.has(task.id)) continue;
      byId.set(task.id, { ...task, goalId: task.goalId ?? goal.id });
    }
  }

  return [...byId.values()];
}

export function planPlannerSync(remote: RemotePlannerIds, snapshot: PlannerSnapshot): PlannerSyncPlan {
  const goalUpserts = new Map<string, Goal>();
  const taskUpserts = new Map<string, Task>();
  const goalDeletes: string[] = [];
  const taskDeletes: string[] = [];
  let layoutOverride: { goals: string[]; tasks: string[] } | null = null;

  const outbox = [...(snapshot.outbox ?? [])].sort((left, right) => left.seq - right.seq);

  for (const item of outbox) {
    if (item.kind === 'delete-goal' && item.entityId) {
      goalDeletes.push(item.entityId);
      goalUpserts.delete(item.entityId);
      continue;
    }

    if (item.kind === 'delete-task' && item.entityId) {
      taskDeletes.push(item.entityId);
      taskUpserts.delete(item.entityId);
      continue;
    }

    if (item.kind === 'upsert-goal' && item.goal?.id) {
      goalUpserts.set(item.goal.id, item.goal);
      continue;
    }

    if (item.kind === 'upsert-task' && item.task?.id) {
      taskUpserts.set(item.task.id, item.task);
      continue;
    }

    if (item.kind === 'layout') {
      layoutOverride = {
        goals: normalizeColumnOrder(item.goalsKanbanColumnOrder),
        tasks: normalizeColumnOrder(item.tasksKanbanColumnOrder),
      };
    }
  }

  const deletedGoals = new Set(goalDeletes);
  const deletedTasks = new Set(taskDeletes);
  const remoteGoals = new Set(remote.goalIds);
  const remoteTasks = new Set(remote.taskIds);

  for (const goal of snapshot.goals ?? []) {
    if (!goal?.id || deletedGoals.has(goal.id) || remoteGoals.has(goal.id) || goalUpserts.has(goal.id)) {
      continue;
    }

    goalUpserts.set(goal.id, goal);
  }

  for (const task of collectPlannerTasks(snapshot)) {
    if (deletedTasks.has(task.id) || remoteTasks.has(task.id) || taskUpserts.has(task.id)) {
      continue;
    }

    taskUpserts.set(task.id, task);
  }

  const remoteGoalOrder = normalizeColumnOrder(remote.goalsKanbanColumnOrder);
  const remoteTaskOrder = normalizeColumnOrder(remote.tasksKanbanColumnOrder);
  const localGoalOrder = normalizeColumnOrder(snapshot.goalsKanbanColumnOrder);
  const localTaskOrder = normalizeColumnOrder(snapshot.tasksKanbanColumnOrder);

  return {
    goalUpserts: [...goalUpserts.values()],
    taskUpserts: [...taskUpserts.values()],
    goalDeletes,
    taskDeletes,
    goalsKanbanColumnOrder: layoutOverride?.goals ?? (remoteGoalOrder.length > 0 ? remoteGoalOrder : localGoalOrder),
    tasksKanbanColumnOrder: layoutOverride?.tasks ?? (remoteTaskOrder.length > 0 ? remoteTaskOrder : localTaskOrder),
    writeLayout: Boolean(
      layoutOverride ||
        (remoteGoalOrder.length === 0 && localGoalOrder.length > 0) ||
        (remoteTaskOrder.length === 0 && localTaskOrder.length > 0)
    ),
  };
}

export function mergePlannerData(
  remote: PlannerData,
  extras: { goals: Goal[]; tasks: Task[] }
): PlannerData {
  const goals = [...remote.goals];
  const tasks = [...remote.tasks];
  const goalIds = new Set(goals.map((goal) => goal.id));
  const taskIds = new Set(tasks.map((task) => task.id));

  for (const goal of extras.goals) {
    if (!goal?.id || goalIds.has(goal.id)) continue;
    goals.push(goal);
    goalIds.add(goal.id);
  }

  for (const task of extras.tasks) {
    if (!task?.id || taskIds.has(task.id)) continue;
    tasks.push(task);
    taskIds.add(task.id);
  }

  return {
    goalsKanbanColumnOrder: remote.goalsKanbanColumnOrder,
    tasksKanbanColumnOrder: remote.tasksKanbanColumnOrder,
    tasks,
    goals: goals.map((goal) => ({
      ...goal,
      tasks: tasks.filter((task) => task.goalId === goal.id),
    })),
  };
}

export function sanitizeGoal(goal: Goal): Goal | null {
  const title = goal.title?.trim().slice(0, 500) ?? '';
  const deadline = parseDate(goal.deadline);

  if (!title || !deadline || !SAFE_ID.test(goal.id)) {
    return null;
  }

  const category = CATEGORIES.has(goal.category)
    ? goal.category
    : getGoalCategoryFromDeadline(deadline);

  return {
    ...goal,
    id: goal.id,
    title,
    description: goal.description?.trim().slice(0, 5000) ?? '',
    progress: clampProgress(goal.progress),
    deadline: deadline.toISOString(),
    category,
    type: sanitizeType(goal.type, 'backlog'),
    priority: sanitizePriority(goal.priority),
    kanbanOrder: clampOrder(goal.kanbanOrder),
    tasks: goal.tasks ?? [],
  };
}

export function sanitizeTask(task: Task, validGoalIds?: Set<string>): Task | null {
  const title = task.title?.trim().slice(0, 500) ?? '';
  if (!title || !SAFE_ID.test(task.id)) {
    return null;
  }

  const deadline = task.deadline ? parseDate(task.deadline) : null;
  const createdAt = parseDate(task.createdAt) ?? new Date();
  const completedAt = task.completedAt ? parseDate(task.completedAt) : null;
  let goalId = task.goalId && SAFE_ID.test(task.goalId) ? task.goalId : undefined;

  if (validGoalIds && goalId && !validGoalIds.has(goalId)) {
    goalId = undefined;
  }

  return {
    ...task,
    id: task.id,
    title,
    description: task.description?.trim().slice(0, 5000) || undefined,
    completed: Boolean(task.completed),
    priority: sanitizePriority(task.priority),
    type: sanitizeType(task.type, 'backlog'),
    goalId,
    createdAt: createdAt.toISOString(),
    completedAt: task.completed && completedAt ? completedAt.toISOString() : undefined,
    deadline: deadline ? deadline.toISOString() : undefined,
    overdue: Boolean(task.overdue),
    kanbanOrder: clampOrder(task.kanbanOrder),
  };
}

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sanitizePriority(value: string | undefined): TaskPriority {
  return value && PRIORITIES.has(value as TaskPriority) ? (value as TaskPriority) : 'medium';
}

function sanitizeType(value: string | undefined, fallback: string): string {
  const type = value?.trim().slice(0, 40) ?? '';
  return /^[A-Za-z0-9_-]+$/.test(type) ? type : fallback;
}

function clampProgress(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

function clampOrder(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value ?? 0));
}
