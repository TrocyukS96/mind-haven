import { buildActivityInput } from '@/entities/activity/lib/build-activity-input';
import type { Project, ProjectNote } from '@/entities/project/model/types';
import type { TaskColumn, TaskColumnKind, TaskColumnPatch } from '@/entities/task-column/model/types';
import type { Task, TaskPriority } from '@/entities/task/model/types';
import {
  createProjectRequest,
  deleteProjectRequest,
  updateProjectRequest,
} from '@/entities/project/api/project-client';
import {
  deleteTaskColumnRequest,
  reorderTaskColumnsRequest,
  updateTaskColumnRequest,
} from '@/entities/task-column/api/task-column-client';
import { isPlannerApiEnabled } from '@/entities/planner/lib/resolve-planner-api';
import { calculateCompletionProgress, tasksForProject } from '@/shared/lib/planner/calculate-progress';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

export interface ProjectsSlice {
  projects: Project[];
  projectNotes: Record<string, ProjectNote[]>;
  taskColumns: TaskColumn[];

  addProject: (input: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    goalId?: string;
    startDate?: string;
    plannedEnd?: string;
    color?: string;
    icon?: string;
  }) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string, mode?: 'detach' | 'unlink') => void;
  archiveProject: (id: string) => void;
  refreshProjectProgress: (projectId: string) => void;

  addProjectNote: (projectId: string, content: string) => void;
  removeProjectNote: (projectId: string, noteId: string) => void;

  addTaskColumn: (
    title: string,
    kind?: TaskColumnKind,
    dateFrom?: string,
    dateTo?: string,
    serverColumn?: TaskColumn
  ) => TaskColumn | undefined;
  replaceTaskColumns: (columns: TaskColumn[], scope?: 'active' | 'archived') => void;
  updateTaskColumn: (id: string, updates: TaskColumnPatch) => Promise<void>;
  reorderTaskColumns: (columnIds: string[]) => void;
  deleteTaskColumn: (
    id: string,
    transferOrOptions?: string | { transferToColumnId?: string; deleteTasks?: boolean }
  ) => Promise<void>;
  archiveTaskColumn: (id: string) => Promise<void>;
  restoreTaskColumn: (id: string) => Promise<void>;

  selectedProject: Project | null;
  isProjectFormOpen: boolean;
  openProjectForm: (project?: Project) => void;
  closeProjectForm: () => void;
}

function refreshLocalProjectProgress(
  set: (fn: (state: AppStore) => Partial<AppStore>) => void,
  get: () => AppStore,
  projectId: string
) {
  const tasks = tasksForProject(get().tasks, projectId);
  const progress = calculateCompletionProgress(tasks);
  set((state) => ({
    projects: state.projects.map((p) => (p.id === projectId ? { ...p, progress } : p)),
  }));
}

function persistProject(get: () => AppStore, project: Project) {
  if (!isPlannerApiEnabled()) return;
  void createProjectRequest(project).catch(() => {
    /* outbox later */
  });
}

function persistProjectUpdate(get: () => AppStore, id: string) {
  if (!isPlannerApiEnabled()) return;
  const project = get().projects.find((p) => p.id === id);
  if (!project) return;
  void updateProjectRequest(id, project).catch(() => undefined);
}

function persistProjectDelete(id: string, mode: 'detach' | 'unlink') {
  if (!isPlannerApiEnabled()) return;
  void deleteProjectRequest(id, mode).catch(() => undefined);
}

export const createProjectsSlice: StateCreator<AppStore, [], [], ProjectsSlice> = (set, get) => ({
  projects: [],
  projectNotes: {},
  taskColumns: [],
  selectedProject: null,
  isProjectFormOpen: false,

  addProject: (input) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const project: Project = {
      id,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      status: 'active',
      priority: input.priority ?? 'medium',
      startDate: input.startDate,
      plannedEnd: input.plannedEnd,
      color: input.color,
      icon: input.icon,
      goalId: input.goalId,
      nextAction: '',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ projects: [project, ...state.projects] }));

    void get().recordActivity(
      buildActivityInput({
        type: 'PROJECT_CREATED',
        entityId: project.id,
        title: project.title,
        metadata: { goalId: project.goalId },
        idempotencyKey: `project:${project.id}:created`,
      })
    );
    persistProject(get, project);
    return id;
  },

  updateProject: (id, updates) => {
    const previous = get().projects.find((p) => p.id === id);
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    }));

    if (updates.status === 'completed' && previous?.status !== 'completed') {
      void get().recordActivity(
        buildActivityInput({
          type: 'PROJECT_COMPLETED',
          entityId: id,
          title: previous?.title ?? updates.title ?? '',
          idempotencyKey: `project:${id}:completed`,
        })
      );
    }

    if (updates.status === 'archived' && previous?.status !== 'archived') {
      void get().recordActivity(
        buildActivityInput({
          type: 'PROJECT_ARCHIVED',
          entityId: id,
          title: previous?.title ?? '',
          idempotencyKey: `project:${id}:archived`,
        })
      );
    } else if (previous && Object.keys(updates).length > 0) {
      void get().recordActivity(
        buildActivityInput({
          type: 'PROJECT_UPDATED',
          entityId: id,
          title: previous.title,
          idempotencyKey: `project:${id}:updated:${Date.now()}`,
        })
      );
    }

    persistProjectUpdate(get, id);
  },

  deleteProject: (id, mode = 'detach') => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      tasks:
        mode === 'detach'
          ? state.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t))
          : state.tasks,
    }));
    persistProjectDelete(id, mode);
  },

  archiveProject: (id) => {
    get().updateProject(id, { status: 'archived' });
  },

  refreshProjectProgress: (projectId) => {
    refreshLocalProjectProgress(set, get, projectId);
  },

  addProjectNote: (projectId, content) => {
    const id = `${Date.now()}-note`;
    const now = new Date().toISOString();
    const note: ProjectNote = { id, projectId, content: content.trim(), createdAt: now, updatedAt: now };
    set((state) => ({
      projectNotes: {
        ...state.projectNotes,
        [projectId]: [note, ...(state.projectNotes[projectId] ?? [])],
      },
    }));
  },

  removeProjectNote: (projectId, noteId) => {
    set((state) => ({
      projectNotes: {
        ...state.projectNotes,
        [projectId]: (state.projectNotes[projectId] ?? []).filter((n) => n.id !== noteId),
      },
    }));
  },

  addTaskColumn: (title, kind = 'custom', dateFrom, dateTo, serverColumn) => {
    if (serverColumn) {
      const existing = get().taskColumns.find((column) => column.id === serverColumn.id);
      if (existing) return existing;
      set((state) => ({ taskColumns: [...state.taskColumns, serverColumn] }));
      return serverColumn;
    }

    if (isPlannerApiEnabled()) {
      return undefined;
    }

    const now = new Date().toISOString();
    if (!get().taskColumns.some((column) => column.legacyKey === 'backlog')) {
      const backlog: TaskColumn = {
        id: 'local-backlog',
        title: 'Backlog',
        kind: 'default',
        legacyKey: 'backlog',
        sortOrder: 0,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
      };
      set((state) => ({ taskColumns: [backlog, ...state.taskColumns] }));
    }

    const column: TaskColumn = {
      id: `${Date.now()}-col`,
      title: title.trim(),
      kind,
      dateFrom,
      dateTo,
      sortOrder: get().taskColumns.length,
      isHidden: false,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ taskColumns: [...state.taskColumns, column] }));
    return column;
  },

  replaceTaskColumns: (columns, scope = 'active') => {
    set((state) => {
      if (scope === 'archived') {
        const active = state.taskColumns.filter((column) => !column.archivedAt);
        const activeIds = new Set(active.map((column) => column.id));
        const archived = columns.filter((column) => column.archivedAt && !activeIds.has(column.id));
        return { taskColumns: [...active, ...archived] };
      }

      const incomingIds = new Set(columns.map((column) => column.id));
      const archived = state.taskColumns.filter((column) => column.archivedAt && !incomingIds.has(column.id));
      return { taskColumns: [...columns, ...archived] };
    });
  },

  updateTaskColumn: async (id, updates) => {
    const previous = get().taskColumns.find((column) => column.id === id);
    if (!previous) return;

    const { archivedAt, dateFrom, dateTo, ...rest } = updates;
    const next: TaskColumn = { ...previous, ...rest, updatedAt: new Date().toISOString() };
    if (archivedAt === null) delete next.archivedAt;
    else if (typeof archivedAt === 'string') next.archivedAt = archivedAt;
    if (dateFrom === null) delete next.dateFrom;
    else if (typeof dateFrom === 'string') next.dateFrom = dateFrom;
    if (dateTo === null) delete next.dateTo;
    else if (typeof dateTo === 'string') next.dateTo = dateTo;

    set((state) => ({
      taskColumns: state.taskColumns.map((column) => (column.id === id ? next : column)),
    }));

    if (!isPlannerApiEnabled()) return;

    try {
      const saved = await updateTaskColumnRequest(id, updates);
      set((state) => ({
        taskColumns: state.taskColumns.map((column) => (column.id === id ? saved : column)),
      }));
    } catch (error) {
      set((state) => ({
        taskColumns: state.taskColumns.map((column) => (column.id === id ? previous : column)),
      }));
      throw error;
    }
  },

  reorderTaskColumns: (columnIds) => {
    set((state) => {
      const byId = new Map(state.taskColumns.map((c) => [c.id, c]));
      const reordered = columnIds
        .map((id, index) => {
          const col = byId.get(id);
          return col ? { ...col, sortOrder: index } : null;
        })
        .filter(Boolean) as TaskColumn[];
      const remaining = state.taskColumns
        .filter((c) => !columnIds.includes(c.id))
        .map((c, index) => ({ ...c, sortOrder: reordered.length + index }));
      return { taskColumns: [...reordered, ...remaining] };
    });
    if (isPlannerApiEnabled()) {
      void reorderTaskColumnsRequest(columnIds).catch(() => undefined);
    }
  },

  deleteTaskColumn: async (id, transferOrOptions) => {
    const options =
      typeof transferOrOptions === 'string'
        ? { transferToColumnId: transferOrOptions }
        : (transferOrOptions ?? {});
    const column = get().taskColumns.find((item) => item.id === id);
    if (!column) return;
    if (column.legacyKey === 'backlog') throw new Error('CANNOT_DELETE_BACKLOG');

    const backlog = get().taskColumns.find((item) => item.legacyKey === 'backlog' && !item.archivedAt);
    const targetId = options.deleteTasks ? undefined : (options.transferToColumnId ?? backlog?.id);
    const target = targetId
      ? get().taskColumns.find((item) => item.id === targetId && !item.archivedAt && item.id !== id)
      : undefined;
    if (!options.deleteTasks && !target) throw new Error('Target column not found');

    const snapshot = {
      taskColumns: get().taskColumns,
      tasks: get().tasks,
      goals: get().goals,
      dailyTasks: get().dailyTasks,
      projects: get().projects,
    };
    const removedTasks = get().tasks.filter((task) => task.columnId === id);
    const removedIds = new Set(removedTasks.map((task) => task.id));

    set((state) => {
      const tasks = options.deleteTasks
        ? state.tasks.filter((task) => task.columnId !== id)
        : state.tasks.map((task) =>
            task.columnId === id
              ? {
                  ...task,
                  columnId: target?.id,
                  ...(target?.legacyKey ? { type: target.legacyKey } : {}),
                }
              : task
          );
      const goals = state.goals.map((goal) => {
        const nextTasks = options.deleteTasks
          ? goal.tasks.filter((task) => !removedIds.has(task.id))
          : goal.tasks.map((task) =>
              task.columnId === id
                ? {
                    ...task,
                    columnId: target?.id,
                    ...(target?.legacyKey ? { type: target.legacyKey } : {}),
                  }
                : task
            );
        if (nextTasks === goal.tasks) return goal;
        const progress =
          nextTasks.length === 0
            ? 0
            : Math.round(
                nextTasks.reduce((total, task) => total + (task.completed ? 100 : 20), 0) / nextTasks.length
              );
        return { ...goal, tasks: nextTasks, progress };
      });
      const dailyTasks = { ...state.dailyTasks };
      if (options.deleteTasks) {
        for (const day of Object.keys(dailyTasks)) {
          dailyTasks[day] = (dailyTasks[day] ?? []).filter((taskId) => !removedIds.has(taskId));
        }
      }
      return {
        taskColumns: state.taskColumns.filter((item) => item.id !== id),
        tasks,
        goals,
        dailyTasks,
      };
    });

    if (options.deleteTasks) {
      const projectIds = new Set(
        removedTasks.map((task) => task.projectId).filter((projectId): projectId is string => Boolean(projectId))
      );
      for (const projectId of projectIds) get().refreshProjectProgress(projectId);
      get().recalculateRating(get().tasks);
    }

    if (!isPlannerApiEnabled()) return;

    try {
      await deleteTaskColumnRequest(id, {
        transferToColumnId: options.deleteTasks ? undefined : target?.id,
        deleteTasks: options.deleteTasks,
      });
    } catch (error) {
      set(snapshot);
      throw error;
    }
  },

  archiveTaskColumn: async (id) => {
    const column = get().taskColumns.find((item) => item.id === id);
    if (!column) return;
    if (column.legacyKey === 'backlog') throw new Error('CANNOT_ARCHIVE_BACKLOG');
    await get().updateTaskColumn(id, { archivedAt: new Date().toISOString() });
  },

  restoreTaskColumn: async (id) => {
    await get().updateTaskColumn(id, { archivedAt: null });
  },

  openProjectForm: (project) =>
    set({ selectedProject: project ?? null, isProjectFormOpen: true }),

  closeProjectForm: () => set({ selectedProject: null, isProjectFormOpen: false }),
});