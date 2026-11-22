import { buildActivityInput } from '@/entities/activity/lib/build-activity-input';
import { getGoalStatus } from '@/shared/lib/goal-heplers';
import {
    createTaskRequest,
    deleteTaskRequest,
    reorderPlannerRequest,
    savePlannerLayoutRequest,
    updateTaskRequest,
} from '@/entities/planner/api/planner-client';
import { reorderProjectStepsRequest } from '@/entities/project/api/project-client';
import { waitForGoalSave } from '@/entities/planner/lib/goal-save-queue';
import { isPlannerApiEnabled } from '@/entities/planner/lib/resolve-planner-api';
import { Task, TaskPriority } from '@/entities/task/model/types';
import type { TaskFormDraft } from '@/features/task/lib/map-voice-to-task-draft';
import {
    buildGoalCompletionEvent,
    buildTaskCompletionEvent,
} from '@/entities/points/lib/calculate-points';
import { tryEarnPoints } from '@/entities/points/lib/process-point-event';
import { sortByKanbanOrder } from '@/shared/lib/kanban-utils';
import {
    insertProjectStep,
    projectStepIdsAfterMove,
    sortProjectSteps,
} from '@/shared/lib/planner/project-step-order';
import { mergeReorderedVisibleColumns, resolveTaskColumnId } from '@/shared/lib/planner/week-column-range';
import { StateCreator } from 'zustand';
import { AppStore } from '../store-config';

export interface TasksSlice {
    tasks: Task[];
    tasksKanbanColumnOrder: string[];
    selectedTask: Task | null;
    dailyTasks: Record<string, string[]>;
    isTaskFormOpen: boolean;
    defaultGoalId?: string;
    defaultProjectId?: string;
    defaultColumnId?: string;
    defaultDeadline?: string;
    taskFormDraft: TaskFormDraft | null;

    addTask: (
        title: string,
        goalId?: string,
        priority?: TaskPriority,
        deadline?: string,
        type?: string,
        description?: string,
        projectId?: string,
        columnId?: string,
        estimatedMinutes?: number,
    ) => void;
    toggleTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (task: Task) => void;
    reorderTasksKanbanColumns: (columnKeys: string[]) => void;
    reassignTasksColumn: (fromKey: string, toKey: string) => void;
    moveTaskInKanban: (taskId: string, targetType: string, targetIndex: number) => void;
    moveTaskToColumn: (
        taskId: string,
        columnId: string,
        targetIndex: number,
        visibleOrder?: string[]
    ) => void;
    moveOpenTasksToColumn: (fromColumnId: string, toColumnId: string) => number;
    reorderProjectSteps: (projectId: string, visibleOrderedIds: string[]) => void;
    openTaskForm: (task?: Task, goalId?: string, deadline?: string, projectId?: string, columnId?: string) => void;
    openTaskFormFromVoice: (draft: TaskFormDraft) => void;
    closeTaskForm: () => void;
    getOverdueTasks: () => Task[];
    markOverdueTasks: () => void;
}

function persistNewTask(get: () => AppStore, task: Task) {
    if (!isPlannerApiEnabled()) return;

    void waitForGoalSave(task.goalId)
        .then(() => createTaskRequest(task))
        .then(async (saved) => {
            if (!get().tasks.some((item) => item.id === task.id)) {
                await deleteTaskRequest(saved.id);
            }
        })
        .catch(() => {
            const latest = get().tasks.find((item) => item.id === task.id);
            if (latest) {
                get().enqueuePlannerOutbox({ kind: 'upsert-task', entityId: task.id, task: latest });
            }
        });
}

function persistTaskUpdate(get: () => AppStore, id: string) {
    if (!isPlannerApiEnabled()) return;

    const current = get().tasks.find((item) => item.id === id);
    void waitForGoalSave(current?.goalId)
        .then(() => {
            const task = get().tasks.find((item) => item.id === id);
            if (!task) return;
            return updateTaskRequest(id, task);
        })
        .catch(() => {
            const latest = get().tasks.find((item) => item.id === id);
            if (latest) {
                get().enqueuePlannerOutbox({ kind: 'upsert-task', entityId: id, task: latest });
            }
        });
}

function persistTaskDelete(get: () => AppStore, id: string) {
    if (!isPlannerApiEnabled()) return;

    get().enqueuePlannerOutbox({ kind: 'delete-task', entityId: id });
    void deleteTaskRequest(id)
        .then(() => {
            get().ackPlannerOutbox(`task:${id}`, 'delete-task');
        })
        .catch(() => undefined);
}

function persistTaskOrder(get: () => AppStore) {
    if (!isPlannerApiEnabled()) return;

    const tasks = get().tasks.map((task) => ({
        id: task.id,
        type: task.type,
        kanbanOrder: task.kanbanOrder ?? 0,
        columnId: task.columnId ?? null,
    }));

    void reorderPlannerRequest({ tasks }).catch(() => {
        for (const task of get().tasks) {
            get().enqueuePlannerOutbox({ kind: 'upsert-task', entityId: task.id, task });
        }
    });
}

function persistProjectStepOrder(get: () => AppStore, projectId: string, stepIds: string[]) {
    if (!isPlannerApiEnabled()) return;

    void reorderProjectStepsRequest(projectId, stepIds).catch(() => {
        for (const id of stepIds) {
            const task = get().tasks.find((item) => item.id === id);
            if (task) {
                get().enqueuePlannerOutbox({ kind: 'upsert-task', entityId: id, task });
            }
        }
    });
}

function persistTaskLayout(get: () => AppStore) {
    if (!isPlannerApiEnabled()) return;

    const goalsKanbanColumnOrder = get().goalsKanbanColumnOrder;
    const tasksKanbanColumnOrder = get().tasksKanbanColumnOrder;

    void savePlannerLayoutRequest({ goalsKanbanColumnOrder, tasksKanbanColumnOrder }).catch(() => {
        get().enqueuePlannerOutbox({
            kind: 'layout',
            entityId: 'layout',
            goalsKanbanColumnOrder,
            tasksKanbanColumnOrder,
        });
    });
}

function patchGoalTasks<T extends { tasks: Task[] }>(goals: T[], patches: Map<string, Partial<Task>>): T[] {
    return goals.map((goal) => {
        let changed = false;
        const tasks = goal.tasks.map((task) => {
            const patch = patches.get(task.id);
            if (!patch) return task;
            changed = true;
            return { ...task, ...patch };
        });
        return changed ? { ...goal, tasks } : goal;
    });
}

const calculateProgress = (subtasks: Task[]) => {
    if (subtasks.length === 0) return 0;
    return Math.round(
        subtasks.reduce((acc, t) => acc + (t.completed ? 100 : 20), 0) / subtasks.length
    );
};

export const createTasksSlice: StateCreator<AppStore, [], [], TasksSlice> = (set, get,) => ({
    tasks: [],
    tasksKanbanColumnOrder: [],
    dailyTasks: {},
    selectedTask: null,
    isTaskFormOpen: false,
    defaultGoalId: undefined,
    taskFormDraft: null,
    addTask: (
        title,
        goalId,
        priority = 'medium',
        deadline?: string,
        type = 'backlog',
        description?: string,
        projectId?: string,
        columnId?: string,
        estimatedMinutes?: number,
    ) => {
        const columns = get().taskColumns;
        const backlog = columns.find((c) => c.legacyKey === 'backlog');
        const resolvedColumnId = columnId ?? backlog?.id;
        const resolvedType =
            columns.find((c) => c.id === resolvedColumnId)?.legacyKey ??
            columns.find((c) => c.legacyKey === type)?.legacyKey ??
            type;

        const columnTasks = get().tasks.filter(
            (item) =>
                (resolvedColumnId && item.columnId === resolvedColumnId) ||
                (!resolvedColumnId && item.type === resolvedType)
        );
        const maxOrder = columnTasks.reduce(
            (max, item) => Math.max(max, item.kanbanOrder ?? -1),
            -1
        );

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const tasksBefore = get().tasks;
        const inserted = projectId ? insertProjectStep(tasksBefore, projectId, id) : null;
        const newTask: Task = {
            id,
            title: title.trim(),
            description: description?.trim() || undefined,
            completed: false,
            priority,
            type: resolvedType,
            goalId,
            projectId,
            columnId: resolvedColumnId,
            estimatedMinutes,
            createdAt: new Date().toISOString(),
            deadline: deadline ? new Date(deadline).toISOString() : undefined,
            kanbanOrder: maxOrder + 1,
            stepOrder: inserted?.stepOrder ?? 0,
        };
        const stepRank = new Map((inserted?.orderedIds ?? []).map((stepId, index) => [stepId, index]));

        set((state) => ({
            tasks: [
                ...state.tasks.map((task) => {
                    const stepOrder = stepRank.get(task.id);
                    if (stepOrder === undefined || task.stepOrder === stepOrder) return task;
                    return { ...task, stepOrder };
                }),
                newTask,
            ],
        }));

        if (deadline) {
            const day = deadline.split('T')[0];
            set((state) => ({
                dailyTasks: {
                    ...state.dailyTasks,
                    [day]: [...(state.dailyTasks[day] || []), newTask.id],
                },
            }));
        }

        if (goalId && !(projectId && get().projects.find((p) => p.id === projectId)?.goalId === goalId)) {
            set((state) => {
                const goal = state.goals.find((g) => g.id === goalId);
                if (!goal) return state;

                const tasks = [...goal.tasks, newTask];
                const progress = calculateProgress(tasks);

                return {
                    goals: state.goals.map((g) =>
                        g.id === goalId ? { ...g, tasks, progress } : g
                    ),
                };
            });
        }

        if (projectId) {
            get().refreshProjectProgress(projectId);
            void get().recordActivity(
                buildActivityInput({
                    type: 'TASK_ASSIGNED_TO_PROJECT',
                    entityId: newTask.id,
                    title: newTask.title,
                    metadata: { projectId },
                    idempotencyKey: `task:${newTask.id}:project:${projectId}`,
                })
            );
        }

        void get().recordActivity(
            buildActivityInput({
                type: 'TASK_CREATED',
                entityId: newTask.id,
                title: newTask.title,
                metadata: { goalId },
                idempotencyKey: `task:${newTask.id}:created`,
            })
        );
        persistNewTask(get, newTask);
        if (projectId && inserted) {
            const shifted = inserted.orderedIds.some((stepId, index) => {
                if (stepId === newTask.id) return false;
                return (tasksBefore.find((task) => task.id === stepId)?.stepOrder ?? 0) !== index;
            });
            if (shifted) persistProjectStepOrder(get, projectId, inserted.orderedIds);
        }
    },

    toggleTask: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        const toggledTask = {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? new Date().toISOString() : undefined,
        };

        set({ tasks: get().tasks.map((t) => (t.id === id ? toggledTask : t)) });

        if (task.goalId) {
            set((state) => {
                const goal = state.goals.find((g) => g.id === task.goalId!);
                if (!goal) return state;

                const tasks = goal.tasks.map((t) =>
                    t.id === id ? toggledTask : t
                );
                const progress = calculateProgress(tasks);

                return {
                    goals: state.goals.map((g) =>
                        g.id === task.goalId ? { ...g, tasks, progress } : g
                    ),
                };
            });
        }

        if (toggledTask.completed) {
            tryEarnPoints(get, buildTaskCompletionEvent(toggledTask));
            void get().recordActivity(
                buildActivityInput({
                    type: 'TASK_COMPLETED',
                    entityId: toggledTask.id,
                    title: toggledTask.title,
                    metadata: { goalId: task.goalId },
                    idempotencyKey: `task:${toggledTask.id}:completed:${toggledTask.completedAt}`,
                })
            );

            if (task.goalId) {
                const goal = get().goals.find((g) => g.id === task.goalId);
                if (goal) {
                    tryEarnPoints(get, buildGoalCompletionEvent(goal));
                    const previousStatus = getGoalStatus(
                        calculateProgress(goal.tasks.map((item) => (item.id === id ? task : item)))
                    );
                    const nextStatus = getGoalStatus(goal.progress);

                    if (nextStatus === 'completed' && previousStatus !== 'completed') {
                        void get().recordActivity(
                            buildActivityInput({
                                type: 'GOAL_COMPLETED',
                                entityId: goal.id,
                                title: goal.title,
                                idempotencyKey: `goal:${goal.id}:completed`,
                            })
                        );
                    } else if (nextStatus !== previousStatus) {
                        void get().recordActivity(
                            buildActivityInput({
                                type: 'GOAL_STATUS_CHANGED',
                                entityId: goal.id,
                                title: goal.title,
                                metadata: { fromStatus: previousStatus, toStatus: nextStatus },
                                idempotencyKey: `goal:${goal.id}:status:${previousStatus}:${nextStatus}:${new Date().toISOString().slice(0, 10)}`,
                            })
                        );
                    }
                }
            }
        }

        if (task.projectId) {
            get().refreshProjectProgress(task.projectId);
        }

        get().recalculateRating(get().tasks);
        persistTaskUpdate(get, id);
    },

    deleteTask: (task: Task) => {
        set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== task.id),
        }))

        if (task?.deadline) {
            const day = task.deadline.split('T')[0];
            set((state) => ({
                dailyTasks: {
                    ...state.dailyTasks,
                    [day]: state.dailyTasks[day].filter(taskId => taskId !== task.id),
                },
            }));
        }

        if (task.goalId) {
            set((state) => {
                const goal = state.goals.find((g) => g.id === task.goalId!);
                if (!goal) return state;

                const tasks = goal.tasks.filter((t) => t.id !== task.id);
                const progress = calculateProgress(tasks);

                return {
                    goals: state.goals.map((g) =>
                        g.id === task.goalId ? { ...g, tasks, progress } : g
                    ),
                };
            });
        }

        if (task.projectId) {
            get().refreshProjectProgress(task.projectId);
        }

        persistTaskDelete(get, task.id);
    },

    updateTask: (id, updates: Partial<Task>) => {
        const tasksBefore = get().tasks;
        const current = tasksBefore.find((task) => task.id === id);
        let nextUpdates = updates;
        let inserted: ReturnType<typeof insertProjectStep> | null = null;
        if (
            current &&
            updates.projectId &&
            updates.projectId !== current.projectId &&
            updates.stepOrder === undefined
        ) {
            inserted = insertProjectStep(tasksBefore, updates.projectId, id);
            nextUpdates = { ...updates, stepOrder: inserted.stepOrder };
        }
        const stepRank = inserted
            ? new Map(inserted.orderedIds.map((stepId, index) => [stepId, index]))
            : null;

        set((state) => ({
            tasks: state.tasks.map((task) => {
                if (task.id === id) return { ...task, ...nextUpdates };
                const stepOrder = stepRank?.get(task.id);
                if (stepOrder === undefined || task.stepOrder === stepOrder) return task;
                return { ...task, stepOrder };
            }),
        }));

        if (updates.deadline) {
            const newDay = updates.deadline.split('T')[0];
            set((state) => ({
                dailyTasks: {
                    ...state.dailyTasks,
                    [newDay]: [...(state.dailyTasks[newDay] || []), id],
                },
            }));
        }


        if (updates.projectId) {
            get().refreshProjectProgress(updates.projectId);
        }

        persistTaskUpdate(get, id);
        if (updates.projectId && inserted) {
            const shifted = inserted.orderedIds.some((stepId, index) => {
                if (stepId === id) return false;
                return (tasksBefore.find((task) => task.id === stepId)?.stepOrder ?? 0) !== index;
            });
            if (shifted) persistProjectStepOrder(get, updates.projectId, inserted.orderedIds);
        }
    },

    moveTaskToColumn: (taskId, columnId, targetIndex, visibleOrder) => {
        const columns = get().taskColumns.filter((column) => !column.archivedAt);
        const column = columns.find((item) => item.id === columnId);
        if (!column) return;

        set((state) => {
            const task = state.tasks.find((item) => item.id === taskId);
            if (!task) return state;

            const keyOf = (item: Task) => resolveTaskColumnId(item, columns);
            const sourceKey = keyOf(task);
            const targetColumnTasks = sortByKanbanOrder(
                state.tasks.filter((item) => keyOf(item) === columnId && item.id !== taskId)
            );
            const clampedIndex = Math.max(0, Math.min(targetIndex, targetColumnTasks.length));
            const previousVisible = (visibleOrder ?? [])
                .filter((id) => id !== taskId && targetColumnTasks.some((item) => item.id === id));
            const orderedIds = visibleOrder
                ? mergeReorderedVisibleColumns(
                    targetColumnTasks.map((item) => item.id),
                    previousVisible,
                    visibleOrder
                )
                : (() => {
                    const ids = targetColumnTasks.map((item) => item.id);
                    ids.splice(clampedIndex, 0, taskId);
                    return ids;
                })();

            if (sourceKey === columnId) {
                const currentIds = sortByKanbanOrder(
                    state.tasks.filter((item) => keyOf(item) === sourceKey)
                ).map((item) => item.id);
                if (currentIds.join('\0') === orderedIds.join('\0')) return state;
            }

            const orderUpdates = new Map<string, Partial<Task>>();
            orderedIds.forEach((id, index) => {
                const patch: Partial<Task> = { columnId, kanbanOrder: index };
                if (id === taskId && column.legacyKey) patch.type = column.legacyKey;
                orderUpdates.set(id, patch);
            });

            if (sourceKey !== columnId) {
                sortByKanbanOrder(
                    state.tasks.filter((item) => keyOf(item) === sourceKey && item.id !== taskId)
                ).forEach((item, index) => {
                    orderUpdates.set(item.id, { kanbanOrder: index });
                });
            }

            const updatedTasks = state.tasks.map((item) => {
                const update = orderUpdates.get(item.id);
                return update ? { ...item, ...update } : item;
            });

            return { tasks: updatedTasks, goals: patchGoalTasks(state.goals, orderUpdates) };
        });

        void get().recordActivity(
            buildActivityInput({
                type: 'TASK_MOVED_TO_COLUMN',
                entityId: taskId,
                title: get().tasks.find((t) => t.id === taskId)?.title ?? '',
                metadata: { columnId },
                idempotencyKey: `task:${taskId}:column:${columnId}:${Date.now()}`,
            })
        );

        persistTaskOrder(get);
    },

    moveOpenTasksToColumn: (fromColumnId, toColumnId) => {
        const target = get().taskColumns.find((column) => column.id === toColumnId && !column.archivedAt);
        if (!target || fromColumnId === toColumnId) return 0;

        let moved = 0;
        set((state) => {
            const moving = sortByKanbanOrder(
                state.tasks.filter((task) => task.columnId === fromColumnId && !task.completed)
            );
            moved = moving.length;
            if (moving.length === 0) return state;

            const movingIds = new Set(moving.map((task) => task.id));
            const staying = sortByKanbanOrder(
                state.tasks.filter((task) => task.columnId === toColumnId && !movingIds.has(task.id))
            );
            const patches = new Map<string, Partial<Task>>();
            let order = 0;
            for (const task of staying) {
                patches.set(task.id, { kanbanOrder: order });
                order += 1;
            }
            for (const task of moving) {
                const patch: Partial<Task> = { columnId: toColumnId, kanbanOrder: order };
                if (target.legacyKey) patch.type = target.legacyKey;
                patches.set(task.id, patch);
                order += 1;
            }
            sortByKanbanOrder(
                state.tasks.filter((task) => task.columnId === fromColumnId && !movingIds.has(task.id))
            ).forEach((task, index) => {
                patches.set(task.id, { kanbanOrder: index });
            });

            return {
                tasks: state.tasks.map((task) => {
                    const patch = patches.get(task.id);
                    return patch ? { ...task, ...patch } : task;
                }),
                goals: patchGoalTasks(state.goals, patches),
            };
        });

        if (moved > 0) persistTaskOrder(get);
        return moved;
    },

    reorderProjectSteps: (projectId, visibleOrderedIds) => {
        const projectTasks = sortProjectSteps(get().tasks.filter((task) => task.projectId === projectId));
        const nextIds = projectStepIdsAfterMove(
            projectTasks.map((task) => task.id),
            visibleOrderedIds
        );
        if (nextIds.length === 0) return;
        const unchanged = nextIds.every(
            (id, index) => projectTasks[index]?.id === id && (projectTasks[index]?.stepOrder ?? 0) === index
        );
        if (unchanged) return;

        const rank = new Map(nextIds.map((id, index) => [id, index]));
        set((state) => {
            const patches = new Map<string, Partial<Task>>();
            for (const [id, stepOrder] of rank) {
                const task = state.tasks.find((item) => item.id === id);
                if (task && task.stepOrder !== stepOrder) patches.set(id, { stepOrder });
            }

            return {
                tasks: state.tasks.map((task) => {
                    const stepOrder = rank.get(task.id);
                    if (task.projectId !== projectId || stepOrder === undefined || task.stepOrder === stepOrder) {
                        return task;
                    }
                    return { ...task, stepOrder };
                }),
                goals: patchGoalTasks(state.goals, patches),
            };
        });

        persistProjectStepOrder(get, projectId, nextIds);
    },

    reorderTasksKanbanColumns: (columnKeys) => {
        set({ tasksKanbanColumnOrder: columnKeys });
        persistTaskLayout(get);
    },

    reassignTasksColumn: (fromKey, toKey) => {
        set((state) => ({
            tasks: state.tasks.map((task) =>
                task.type === fromKey ? { ...task, type: toKey } : task
            ),
            tasksKanbanColumnOrder: state.tasksKanbanColumnOrder.filter((key) => key !== fromKey),
            goals: state.goals.map((goal) => ({
                ...goal,
                tasks: (goal.tasks ?? []).map((task) =>
                    task.type === fromKey ? { ...task, type: toKey } : task
                ),
            })),
        }));
        persistTaskOrder(get);
        persistTaskLayout(get);
    },

    moveTaskInKanban: (taskId, targetType, targetIndex) => {
        set((state) => {
            const task = state.tasks.find((item) => item.id === taskId);
            if (!task) {
                return state;
            }

            const sourceType = task.type;
            const currentColumnTasks = sortByKanbanOrder(
                state.tasks.filter((item) => item.type === sourceType)
            );
            const currentIndex = currentColumnTasks.findIndex((item) => item.id === taskId);

            const targetColumnTasks = sortByKanbanOrder(
                state.tasks.filter((item) => item.type === targetType)
            ).filter((item) => item.id !== taskId);

            const clampedIndex = Math.max(0, Math.min(targetIndex, targetColumnTasks.length));

            if (sourceType === targetType && currentIndex === clampedIndex) {
                return state;
            }

            targetColumnTasks.splice(clampedIndex, 0, { ...task, type: targetType });

            const orderUpdates = new Map<string, { type: string; kanbanOrder: number }>();
            targetColumnTasks.forEach((item, index) => {
                orderUpdates.set(item.id, { type: targetType, kanbanOrder: index });
            });

            if (sourceType !== targetType) {
                sortByKanbanOrder(
                    state.tasks.filter((item) => item.type === sourceType && item.id !== taskId)
                ).forEach((item, index) => {
                    orderUpdates.set(item.id, { type: sourceType, kanbanOrder: index });
                });
            }

            const updatedTasks = state.tasks.map((item) => {
                const update = orderUpdates.get(item.id);
                return update ? { ...item, ...update } : item;
            });

            return {
                tasks: updatedTasks,
                goals: state.goals.map((goal) => {
                    let changed = false;
                    const tasks = goal.tasks.map((goalTask) => {
                        const update = orderUpdates.get(goalTask.id);
                        if (!update) {
                            return goalTask;
                        }
                        changed = true;
                        return { ...goalTask, ...update };
                    });

                    return changed
                        ? { ...goal, tasks, progress: calculateProgress(tasks) }
                        : goal;
                }),
            };
        });
        persistTaskOrder(get);
    },

    openTaskForm: (task, goalId, deadline, projectId, columnId) => {
        set({
            selectedTask: task || null,
            isTaskFormOpen: true,
            defaultGoalId: goalId,
            defaultProjectId: projectId,
            defaultColumnId: columnId,
            defaultDeadline: deadline || '',
            taskFormDraft: null,
        });
    },
    openTaskFormFromVoice: (draft) => {
        set({
            selectedTask: null,
            isTaskFormOpen: true,
            defaultGoalId: undefined,
            defaultDeadline: draft.deadline || '',
            taskFormDraft: draft,
        });
    },
    closeTaskForm: () =>
        set({
            selectedTask: null,
            isTaskFormOpen: false,
            defaultGoalId: undefined,
            defaultProjectId: undefined,
            defaultColumnId: undefined,
            defaultDeadline: undefined,
            taskFormDraft: null,
        }),

    getOverdueTasks: () => {
        const now = new Date().toISOString().split('T')[0];
        return get().tasks.filter(task =>
            task.deadline &&
            task.deadline < now &&
            !task.completed
        );
    },

    // Вызывай при загрузке приложения или монтировании страницы
    markOverdueTasks: () => {
        const now = new Date().toISOString().split('T')[0];
        let hasChanges = false;

        const nextTasks = get().tasks.map((task) => {
            const shouldBeOverdue = Boolean(
                task.deadline && task.deadline < now && !task.completed
            );

            if (shouldBeOverdue === Boolean(task.overdue)) {
                return task;
            }

            hasChanges = true;
            return { ...task, overdue: shouldBeOverdue };
        });

        if (hasChanges) {
            const previousTasks = get().tasks;
            set({ tasks: nextTasks });

            nextTasks.forEach((task) => {
                const previous = previousTasks.find((item) => item.id === task.id);
                const wasOverdue = Boolean(previous?.overdue);
                if (task.overdue && !wasOverdue) {
                    void get().recordActivity(
                        buildActivityInput({
                            type: 'TASK_OVERDUE',
                            entityId: task.id,
                            title: task.title,
                            idempotencyKey: `task:${task.id}:overdue:${task.deadline ?? now}`,
                        })
                    );
                }
                if (previous && previous.overdue !== task.overdue) {
                    persistTaskUpdate(get, task.id);
                }
            });
        }

        get().recalculateRating(hasChanges ? nextTasks : get().tasks);
    },

});