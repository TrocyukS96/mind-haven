import type { Goal } from '@/entities/goal/model/types';
import type { Project, ProjectNote } from '@/entities/project/model/types';
import type { TaskColumn } from '@/entities/task-column/model/types';
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
  projects?: Project[];
  taskColumns?: TaskColumn[];
  goalsKanbanColumnOrder: string[];
  tasksKanbanColumnOrder: string[];
  outbox: PlannerOutboxItem[];
}

export interface PlannerData {
  goals: Goal[];
  tasks: Task[];
  projects: Project[];
  projectNotes: Record<string, ProjectNote[]>;
  taskColumns: TaskColumn[];
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
    projects: remote.projects ?? [],
    projectNotes: remote.projectNotes ?? {},
    taskColumns: remote.taskColumns ?? [],
    goals: goals.map((goal) => ({
      ...goal,
      tasks: tasks.filter((task) => task.goalId === goal.id),
    })),
  };
}

export interface PlannerSyncCursor {
  ready: boolean;
  goalIds: string[];
  taskIds: string[];
  projectIds: string[];
  columnIds: string[];
  noteIds: string[];
}

export const EMPTY_PLANNER_SYNC_CURSOR: PlannerSyncCursor = {
  ready: false,
  goalIds: [],
  taskIds: [],
  projectIds: [],
  columnIds: [],
  noteIds: [],
};

export interface PlannerCache {
  goals: Goal[];
  tasks: Task[];
  projects: Project[];
  projectNotes: Record<string, ProjectNote[]>;
  taskColumns: TaskColumn[];
  goalsKanbanColumnOrder: string[];
  tasksKanbanColumnOrder: string[];
  outbox: PlannerOutboxItem[];
}

export interface PlannerSyncBlocklist {
  goalIds: string[];
  taskIds: string[];
  projectIds: string[];
  columnIds: string[];
  noteIds: string[];
}

export interface PlannerSyncStartedIds {
  goalIds: string[];
  taskIds: string[];
  projectIds: string[];
  columnIds: string[];
  noteIds: string[];
}

export interface PreparedPlannerSync {
  cursor: PlannerSyncCursor;
  snapshot: PlannerSnapshot;
  view: PlannerData | null;
  queued: PlannerOutboxItem[];
  blocked: PlannerSyncBlocklist;
}

function listNotes(notes: Record<string, ProjectNote[]> | undefined): ProjectNote[] {
  return Object.values(notes ?? {}).flat();
}

function groupNotes(notes: ProjectNote[]): Record<string, ProjectNote[]> {
  const grouped: Record<string, ProjectNote[]> = {};

  for (const note of notes) {
    if (!note?.id || !note.projectId) continue;
    grouped[note.projectId] = [...(grouped[note.projectId] ?? []), note];
  }

  return grouped;
}

function keepUnsynced<T extends { id: string }>(remoteItems: T[], localItems: T[], knownIds: Set<string>): T[] {
  const remoteIds = new Set(remoteItems.map((item) => item.id));
  const extras = localItems.filter((item) => item?.id && !knownIds.has(item.id) && !remoteIds.has(item.id));
  return [...remoteItems, ...extras];
}

function readOutbox(outbox: PlannerOutboxItem[]) {
  const goalDeletes = new Set<string>();
  const taskDeletes = new Set<string>();
  const goalUpserts = new Map<string, Goal>();
  const taskUpserts = new Map<string, Task>();
  let layout: { goals: string[]; tasks: string[] } | null = null;

  for (const item of [...outbox].sort((left, right) => left.seq - right.seq)) {
    if (item.kind === 'delete-goal' && item.entityId) {
      goalDeletes.add(item.entityId);
      goalUpserts.delete(item.entityId);
      continue;
    }

    if (item.kind === 'delete-task' && item.entityId) {
      taskDeletes.add(item.entityId);
      taskUpserts.delete(item.entityId);
      continue;
    }

    if (item.kind === 'upsert-goal' && item.goal?.id) {
      goalDeletes.delete(item.goal.id);
      goalUpserts.set(item.goal.id, item.goal);
      continue;
    }

    if (item.kind === 'upsert-task' && item.task?.id) {
      taskDeletes.delete(item.task.id);
      taskUpserts.set(item.task.id, item.task);
      continue;
    }

    if (item.kind === 'layout') {
      layout = {
        goals: normalizeColumnOrder(item.goalsKanbanColumnOrder),
        tasks: normalizeColumnOrder(item.tasksKanbanColumnOrder),
      };
    }
  }

  return { goalDeletes, taskDeletes, goalUpserts, taskUpserts, layout };
}

export function preparePlannerSync(
  remote: PlannerData | null,
  local: PlannerCache,
  cursor: PlannerSyncCursor | null | undefined
): PreparedPlannerSync {
  const localTasks = collectPlannerTasks(local);
  const source = cursor?.ready ? cursor : EMPTY_PLANNER_SYNC_CURSOR;
  const knownGoalIds = new Set(source.ready ? source.goalIds : (local.goals ?? []).map((goal) => goal.id));
  const knownTaskIds = new Set(source.ready ? source.taskIds : localTasks.map((task) => task.id));
  const knownProjectIds = new Set(source.ready ? source.projectIds : (local.projects ?? []).map((project) => project.id));
  const knownColumnIds = new Set(source.ready ? source.columnIds : (local.taskColumns ?? []).map((column) => column.id));
  const knownNoteIds = new Set(source.ready ? source.noteIds : listNotes(local.projectNotes).map((note) => note.id));
  const nextCursor: PlannerSyncCursor = {
    ready: true,
    goalIds: [...knownGoalIds],
    taskIds: [...knownTaskIds],
    projectIds: [...knownProjectIds],
    columnIds: [...knownColumnIds],
    noteIds: [...knownNoteIds],
  };
  const trustRemote = remote != null;
  const remoteGoalIds = new Set((remote?.goals ?? []).map((goal) => goal.id));
  const remoteTaskIds = new Set((remote?.tasks ?? []).map((task) => task.id));
  const parsed = readOutbox(local.outbox ?? []);
  const queued: PlannerOutboxItem[] = [];
  let seq = (local.outbox ?? []).reduce((max, item) => Math.max(max, item.seq), 0);

  if (trustRemote) {
    for (const goal of local.goals ?? []) {
      if (
        !goal?.id ||
        knownGoalIds.has(goal.id) ||
        remoteGoalIds.has(goal.id) ||
        parsed.goalDeletes.has(goal.id) ||
        parsed.goalUpserts.has(goal.id)
      ) {
        continue;
      }

      seq += 1;
      const item: PlannerOutboxItem = {
        seq,
        key: `goal:${goal.id}`,
        kind: 'upsert-goal',
        entityId: goal.id,
        goal,
      };
      queued.push(item);
      parsed.goalUpserts.set(goal.id, goal);
    }

    for (const task of localTasks) {
      if (
        knownTaskIds.has(task.id) ||
        remoteTaskIds.has(task.id) ||
        parsed.taskDeletes.has(task.id) ||
        parsed.taskUpserts.has(task.id)
      ) {
        continue;
      }

      seq += 1;
      const item: PlannerOutboxItem = {
        seq,
        key: `task:${task.id}`,
        kind: 'upsert-task',
        entityId: task.id,
        task,
      };
      queued.push(item);
      parsed.taskUpserts.set(task.id, task);
    }
  }

  const staleGoal = (id: string) =>
    trustRemote && knownGoalIds.has(id) && !remoteGoalIds.has(id) && !parsed.goalUpserts.has(id);
  const staleTask = (id: string) =>
    trustRemote && knownTaskIds.has(id) && !remoteTaskIds.has(id) && !parsed.taskUpserts.has(id);
  const snapshotGoals = (trustRemote ? (local.goals ?? []) : [...parsed.goalUpserts.values()]).filter(
    (goal) => goal?.id && !parsed.goalDeletes.has(goal.id) && !staleGoal(goal.id)
  );
  const snapshotTasks = (trustRemote ? localTasks : [...parsed.taskUpserts.values()]).filter(
    (task) => task?.id && !parsed.taskDeletes.has(task.id) && !staleTask(task.id)
  );
  const outboxByKey = new Map((local.outbox ?? []).map((item) => [item.key, item]));

  for (const item of queued) {
    outboxByKey.set(item.key, item);
  }

  const snapshot: PlannerSnapshot = {
    goals: snapshotGoals,
    tasks: snapshotTasks,
    goalsKanbanColumnOrder: trustRemote ? remote.goalsKanbanColumnOrder : (local.goalsKanbanColumnOrder ?? []),
    tasksKanbanColumnOrder: trustRemote ? remote.tasksKanbanColumnOrder : (local.tasksKanbanColumnOrder ?? []),
    outbox: [...outboxByKey.values()],
  };

  let view: PlannerData | null = null;

  if (remote) {
    const goals = remote.goals
      .filter((goal) => !parsed.goalDeletes.has(goal.id))
      .map((goal) => parsed.goalUpserts.get(goal.id) ?? goal);

    for (const goal of parsed.goalUpserts.values()) {
      if (!parsed.goalDeletes.has(goal.id) && !goals.some((item) => item.id === goal.id)) {
        goals.push(goal);
      }
    }

    const tasks = remote.tasks
      .filter((task) => !parsed.taskDeletes.has(task.id))
      .map((task) => parsed.taskUpserts.get(task.id) ?? task);

    for (const task of parsed.taskUpserts.values()) {
      if (!parsed.taskDeletes.has(task.id) && !tasks.some((item) => item.id === task.id)) {
        tasks.push(task);
      }
    }

    view = mergePlannerData(
      {
        ...remote,
        goals: [],
        tasks: [],
        projects: keepUnsynced(remote.projects ?? [], local.projects ?? [], knownProjectIds),
        taskColumns: keepUnsynced(remote.taskColumns ?? [], local.taskColumns ?? [], knownColumnIds),
        projectNotes: groupNotes(
          keepUnsynced(listNotes(remote.projectNotes), listNotes(local.projectNotes), knownNoteIds)
        ),
        goalsKanbanColumnOrder: parsed.layout?.goals ?? remote.goalsKanbanColumnOrder,
        tasksKanbanColumnOrder: parsed.layout?.tasks ?? remote.tasksKanbanColumnOrder,
      },
      { goals, tasks }
    );
  }

  const viewGoalIds = new Set((view?.goals ?? []).map((goal) => goal.id));
  const viewTaskIds = new Set((view?.tasks ?? []).map((task) => task.id));
  const viewProjectIds = new Set((view?.projects ?? []).map((project) => project.id));
  const viewColumnIds = new Set((view?.taskColumns ?? []).map((column) => column.id));
  const viewNoteIds = new Set(listNotes(view?.projectNotes).map((note) => note.id));
  const blocked: PlannerSyncBlocklist = view
    ? {
        goalIds: (local.goals ?? []).map((goal) => goal.id).filter((id) => id && !viewGoalIds.has(id)),
        taskIds: localTasks.map((task) => task.id).filter((id) => !viewTaskIds.has(id)),
        projectIds: (local.projects ?? []).map((project) => project.id).filter((id) => id && !viewProjectIds.has(id)),
        columnIds: (local.taskColumns ?? []).map((column) => column.id).filter((id) => id && !viewColumnIds.has(id)),
        noteIds: listNotes(local.projectNotes)
          .map((note) => note.id)
          .filter((id) => id && !viewNoteIds.has(id)),
      }
    : { goalIds: [], taskIds: [], projectIds: [], columnIds: [], noteIds: [] };

  return { cursor: nextCursor, snapshot, view, queued, blocked };
}

export function mergePlannerSyncResult(
  remote: PlannerData,
  current: PlannerCache,
  started: PlannerSyncStartedIds,
  blocked: PlannerSyncBlocklist,
  known: PlannerSyncCursor = EMPTY_PLANNER_SYNC_CURSOR
): PlannerData {
  const dropGoals = new Set(blocked.goalIds);
  const dropTasks = new Set(blocked.taskIds);
  const dropProjects = new Set(blocked.projectIds);
  const dropColumns = new Set(blocked.columnIds);
  const dropNotes = new Set(blocked.noteIds);
  const currentGoalIds = new Set((current.goals ?? []).map((goal) => goal.id));
  const currentTaskIds = new Set(collectPlannerTasks(current).map((task) => task.id));
  const currentProjectIds = new Set((current.projects ?? []).map((project) => project.id));
  const currentColumnIds = new Set((current.taskColumns ?? []).map((column) => column.id));
  const currentNoteIds = new Set(listNotes(current.projectNotes).map((note) => note.id));

  for (const id of started.goalIds) if (!currentGoalIds.has(id)) dropGoals.add(id);
  for (const id of started.taskIds) if (!currentTaskIds.has(id)) dropTasks.add(id);
  for (const id of started.projectIds) if (!currentProjectIds.has(id)) dropProjects.add(id);
  for (const id of started.columnIds) if (!currentColumnIds.has(id)) dropColumns.add(id);
  for (const id of started.noteIds) if (!currentNoteIds.has(id)) dropNotes.add(id);

  for (const item of current.outbox ?? []) {
    if (item.kind === 'delete-goal' && item.entityId) dropGoals.add(item.entityId);
    if (item.kind === 'delete-task' && item.entityId) dropTasks.add(item.entityId);
  }

  const remoteGoalIds = new Set(remote.goals.map((goal) => goal.id));
  const remoteTaskIds = new Set(remote.tasks.map((task) => task.id));
  const remoteProjectIds = new Set((remote.projects ?? []).map((project) => project.id));
  const remoteColumnIds = new Set((remote.taskColumns ?? []).map((column) => column.id));
  const remoteNoteIds = new Set(listNotes(remote.projectNotes).map((note) => note.id));
  const knownGoalIds = new Set(known.ready ? known.goalIds : []);
  const knownTaskIds = new Set(known.ready ? known.taskIds : []);
  const knownProjectIds = new Set(known.ready ? known.projectIds : []);
  const knownColumnIds = new Set(known.ready ? known.columnIds : []);
  const knownNoteIds = new Set(known.ready ? known.noteIds : []);
  const pendingGoalIds = new Set(
    (current.outbox ?? []).filter((item) => item.kind === 'upsert-goal').map((item) => item.entityId)
  );
  const pendingTaskIds = new Set(
    (current.outbox ?? []).filter((item) => item.kind === 'upsert-task').map((item) => item.entityId)
  );
  const keepLocal = (id: string, knownIds: Set<string>, pendingIds?: Set<string>) =>
    !known.ready || !knownIds.has(id) || Boolean(pendingIds?.has(id));
  const extraGoals = (current.goals ?? []).filter(
    (goal) => goal?.id && !dropGoals.has(goal.id) && !remoteGoalIds.has(goal.id) && keepLocal(goal.id, knownGoalIds, pendingGoalIds)
  );
  const extraTasks = collectPlannerTasks(current).filter(
    (task) => !dropTasks.has(task.id) && !remoteTaskIds.has(task.id) && keepLocal(task.id, knownTaskIds, pendingTaskIds)
  );
  const goalOverlay = new Map<string, Goal>();
  const taskOverlay = new Map<string, Task>();

  for (const item of [...(current.outbox ?? [])].sort((left, right) => left.seq - right.seq)) {
    if (item.kind === 'upsert-goal' && item.goal?.id && !dropGoals.has(item.goal.id)) {
      goalOverlay.set(item.goal.id, item.goal);
    }
    if (item.kind === 'upsert-task' && item.task?.id && !dropTasks.has(item.task.id)) {
      taskOverlay.set(item.task.id, item.task);
    }
  }

  const merged = mergePlannerData(remote, { goals: extraGoals, tasks: extraTasks });
  const goals = merged.goals
    .filter((goal) => !dropGoals.has(goal.id))
    .map((goal) => goalOverlay.get(goal.id) ?? goal);

  for (const goal of goalOverlay.values()) {
    if (!dropGoals.has(goal.id) && !goals.some((item) => item.id === goal.id)) goals.push(goal);
  }

  const tasks = merged.tasks
    .filter((task) => !dropTasks.has(task.id) && (!task.goalId || !dropGoals.has(task.goalId)))
    .map((task) => taskOverlay.get(task.id) ?? task);

  for (const task of taskOverlay.values()) {
    if (!dropTasks.has(task.id) && !tasks.some((item) => item.id === task.id)) tasks.push(task);
  }

  return mergePlannerData(
    {
      ...merged,
      goals: [],
      tasks: [],
      projects: [
        ...(remote.projects ?? []).filter((project) => !dropProjects.has(project.id)),
        ...(current.projects ?? []).filter(
          (project) =>
            project?.id &&
            !dropProjects.has(project.id) &&
            !remoteProjectIds.has(project.id) &&
            keepLocal(project.id, knownProjectIds)
        ),
      ],
      taskColumns: [
        ...(remote.taskColumns ?? []).filter((column) => !dropColumns.has(column.id)),
        ...(current.taskColumns ?? []).filter(
          (column) =>
            column?.id &&
            !dropColumns.has(column.id) &&
            !remoteColumnIds.has(column.id) &&
            keepLocal(column.id, knownColumnIds)
        ),
      ],
      projectNotes: groupNotes([
        ...listNotes(remote.projectNotes).filter((note) => !dropNotes.has(note.id)),
        ...listNotes(current.projectNotes).filter(
          (note) =>
            note?.id &&
            !dropNotes.has(note.id) &&
            !remoteNoteIds.has(note.id) &&
            keepLocal(note.id, knownNoteIds)
        ),
      ]),
    },
    { goals, tasks }
  );
}

export function cursorFromPlanner(remote: PlannerData, visible: PlannerData): PlannerSyncCursor {
  const visibleGoals = new Set(visible.goals.map((goal) => goal.id));
  const visibleTasks = new Set(visible.tasks.map((task) => task.id));
  const visibleProjects = new Set((visible.projects ?? []).map((project) => project.id));
  const visibleColumns = new Set((visible.taskColumns ?? []).map((column) => column.id));
  const visibleNotes = new Set(listNotes(visible.projectNotes).map((note) => note.id));

  return {
    ready: true,
    goalIds: remote.goals.map((goal) => goal.id).filter((id) => visibleGoals.has(id)),
    taskIds: remote.tasks.map((task) => task.id).filter((id) => visibleTasks.has(id)),
    projectIds: (remote.projects ?? []).map((project) => project.id).filter((id) => visibleProjects.has(id)),
    columnIds: (remote.taskColumns ?? []).map((column) => column.id).filter((id) => visibleColumns.has(id)),
    noteIds: listNotes(remote.projectNotes)
      .map((note) => note.id)
      .filter((id) => visibleNotes.has(id)),
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

  let projectId = task.projectId && SAFE_ID.test(task.projectId) ? task.projectId : undefined;
  let columnId = task.columnId && SAFE_ID.test(task.columnId) ? task.columnId : undefined;

  const estimatedMinutes =
    task.estimatedMinutes !== undefined && Number.isFinite(task.estimatedMinutes)
      ? Math.max(0, Math.min(60 * 24 * 7, Math.round(task.estimatedMinutes)))
      : undefined;

  return {
    ...task,
    id: task.id,
    title,
    description: task.description?.trim().slice(0, 5000) || undefined,
    completed: Boolean(task.completed),
    priority: sanitizePriority(task.priority),
    type: sanitizeType(task.type, 'backlog'),
    goalId,
    projectId,
    columnId,
    estimatedMinutes,
    createdAt: createdAt.toISOString(),
    completedAt: task.completed && completedAt ? completedAt.toISOString() : undefined,
    deadline: deadline ? deadline.toISOString() : undefined,
    overdue: Boolean(task.overdue),
    kanbanOrder: clampOrder(task.kanbanOrder),
    stepOrder: clampOrder(task.stepOrder),
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
