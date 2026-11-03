import { buildActivityInput } from '@/entities/activity/lib/build-activity-input';
import { Goal } from '@/entities/goal/model/types';
import { getGoalCategoryFromDeadline } from '@/entities/goal/lib/get-goal-category-from-deadline';
import {
  createGoalRequest,
  deleteGoalRequest,
  reorderPlannerRequest,
  savePlannerLayoutRequest,
  updateGoalRequest,
} from '@/entities/planner/api/planner-client';
import { trackGoalSave, waitForGoalSave } from '@/entities/planner/lib/goal-save-queue';
import { isPlannerApiEnabled } from '@/entities/planner/lib/resolve-planner-api';
import type { Task } from '@/entities/task/model/types';
import type { GoalFormDraft } from '@/features/goal/lib/map-voice-to-goal-draft';
import { sortByKanbanOrder } from '@/shared/lib/kanban-utils';
import type { PlannerData, PlannerOutboxItem } from '@/shared/lib/planner/planner-merge';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

const initialGoals: Goal[] = [];

export interface PlannerOutboxInput {
  kind: PlannerOutboxItem['kind'];
  entityId: string;
  goal?: Goal;
  task?: Task;
  goalsKanbanColumnOrder?: string[];
  tasksKanbanColumnOrder?: string[];
}

export interface GoalsSlice {
  goals: Goal[];
  goalsKanbanColumnOrder: string[];
  plannerApiEnabled: boolean;
  plannerOutbox: PlannerOutboxItem[];

  setPlannerApiEnabled: (enabled: boolean) => void;
  hydratePlanner: (data: PlannerData) => void;
  enqueuePlannerOutbox: (input: PlannerOutboxInput) => void;
  clearPlannerOutbox: (maxSeq: number) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'progress' | 'category'>) => string;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  updateGoalProgress: (id: string, progress: number) => void;
  reorderGoalsKanbanColumns: (columnKeys: string[]) => void;
  reassignGoalsColumn: (fromKey: string, toKey: string) => void;
  moveGoalInKanban: (goalId: string, targetType: string, targetIndex: number) => void;

  selectedGoal: Goal | null;
  isGoalFormOpen: boolean;
  goalFormDraft: GoalFormDraft | null;
  openGoalForm: (goal?: Goal) => void;
  openGoalFormFromVoice: (draft: GoalFormDraft) => void;
  closeGoalForm: () => void;
}

function outboxKey(kind: PlannerOutboxItem['kind'], entityId: string) {
  if (kind === 'layout') return 'layout';
  return `${kind.endsWith('goal') ? 'goal' : 'task'}:${entityId}`;
}

function persistNewGoal(get: () => AppStore, goal: Goal) {
  if (!isPlannerApiEnabled()) return;

  const pending = createGoalRequest(goal)
    .then(async (saved) => {
      if (!get().goals.some((item) => item.id === goal.id)) {
        await deleteGoalRequest(saved.id);
      }
    })
    .catch(() => {
      const latest = get().goals.find((item) => item.id === goal.id);
      if (latest) {
        get().enqueuePlannerOutbox({ kind: 'upsert-goal', entityId: goal.id, goal: latest });
      }
    });

  trackGoalSave(goal.id, pending);
}

function persistGoalUpdate(get: () => AppStore, id: string) {
  if (!isPlannerApiEnabled()) return;

  const goal = get().goals.find((item) => item.id === id);
  if (!goal) return;

  const pending = updateGoalRequest(id, goal)
    .then(() => undefined)
    .catch(() => {
      const latest = get().goals.find((item) => item.id === id);
      if (latest) {
        get().enqueuePlannerOutbox({ kind: 'upsert-goal', entityId: id, goal: latest });
      }
    });

  trackGoalSave(id, pending);
}

function persistGoalDelete(get: () => AppStore, id: string) {
  if (!isPlannerApiEnabled()) return;

  const pending = waitForGoalSave(id)
    .then(() => deleteGoalRequest(id))
    .catch(() => {
      get().enqueuePlannerOutbox({ kind: 'delete-goal', entityId: id });
    });

  trackGoalSave(id, pending);
}

function persistGoalOrder(get: () => AppStore) {
  if (!isPlannerApiEnabled()) return;

  const goals = get().goals.map((goal) => ({
    id: goal.id,
    type: goal.type,
    kanbanOrder: goal.kanbanOrder ?? 0,
  }));

  void reorderPlannerRequest({ goals }).catch(() => {
    for (const goal of get().goals) {
      get().enqueuePlannerOutbox({ kind: 'upsert-goal', entityId: goal.id, goal });
    }
  });
}

function persistLayout(get: () => AppStore) {
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

export const createGoalsSlice: StateCreator<AppStore, [], [], GoalsSlice> = (set, get) => ({
  goals: initialGoals,
  goalsKanbanColumnOrder: [],
  plannerApiEnabled: false,
  plannerOutbox: [],
  selectedGoal: null,
  isGoalFormOpen: false,
  goalFormDraft: null,

  setPlannerApiEnabled: (enabled) => set({ plannerApiEnabled: enabled }),

  hydratePlanner: (data) =>
    set({
      goals: data.goals,
      tasks: data.tasks,
      goalsKanbanColumnOrder: data.goalsKanbanColumnOrder,
      tasksKanbanColumnOrder: data.tasksKanbanColumnOrder,
    }),

  enqueuePlannerOutbox: (input) =>
    set((state) => {
      const key = outboxKey(input.kind, input.entityId);
      const item: PlannerOutboxItem = {
        seq: Date.now(),
        key,
        kind: input.kind,
        entityId: input.entityId,
        goal: input.goal,
        task: input.task,
        goalsKanbanColumnOrder: input.goalsKanbanColumnOrder,
        tasksKanbanColumnOrder: input.tasksKanbanColumnOrder,
      };

      return {
        plannerOutbox: [...state.plannerOutbox.filter((entry) => entry.key !== key), item],
      };
    }),

  clearPlannerOutbox: (maxSeq) =>
    set((state) => ({
      plannerOutbox: state.plannerOutbox.filter((item) => item.seq > maxSeq),
    })),

  addGoal: (goal) => {
    const id = Date.now().toString();

    set((state) => {
      const columnGoals = state.goals.filter((item) => item.type === goal.type);
      const maxOrder = columnGoals.reduce(
        (max, item) => Math.max(max, item.kanbanOrder ?? -1),
        -1
      );

      return {
        goals: [
          ...state.goals,
          {
            ...goal,
            category: getGoalCategoryFromDeadline(goal.deadline),
            id,
            progress: 0,
            kanbanOrder: maxOrder + 1,
          },
        ],
      };
    });

    const created = get().goals.find((item) => item.id === id);
    if (created) {
      persistNewGoal(get, created);
    }

    void get().recordActivity(
      buildActivityInput({
        type: 'GOAL_CREATED',
        entityId: id,
        title: goal.title,
        idempotencyKey: `goal:${id}:created`,
      })
    );

    return id;
  },

  updateGoal: (id, updates) => {
    set((state) => ({
      goals: state.goals.map((g) => {
        if (g.id !== id) return g;

        const next = { ...g, ...updates };
        if (updates.deadline !== undefined) {
          next.category = getGoalCategoryFromDeadline(updates.deadline);
        }
        return next;
      }),
    }));
    persistGoalUpdate(get, id);
  },

  deleteGoal: (id) => {
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    }));
    persistGoalDelete(get, id);
  },

  updateGoalProgress: (id, progress) => {
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, progress } : g
      ),
    }));
    persistGoalUpdate(get, id);
  },

  reorderGoalsKanbanColumns: (columnKeys) => {
    set({ goalsKanbanColumnOrder: columnKeys });
    persistLayout(get);
  },

  reassignGoalsColumn: (fromKey, toKey) => {
    set((state) => ({
      goals: state.goals.map((goal) =>
        goal.type === fromKey ? { ...goal, type: toKey } : goal
      ),
      goalsKanbanColumnOrder: state.goalsKanbanColumnOrder.filter((key) => key !== fromKey),
    }));
    persistGoalOrder(get);
    persistLayout(get);
  },

  moveGoalInKanban: (goalId, targetType, targetIndex) => {
    set((state) => {
      const goal = state.goals.find((item) => item.id === goalId);
      if (!goal) {
        return state;
      }

      const sourceType = goal.type;
      const currentColumnGoals = sortByKanbanOrder(
        state.goals.filter((item) => item.type === sourceType)
      );
      const currentIndex = currentColumnGoals.findIndex((item) => item.id === goalId);

      const targetColumnGoals = sortByKanbanOrder(
        state.goals.filter((item) => item.type === targetType)
      ).filter((item) => item.id !== goalId);

      const clampedIndex = Math.max(0, Math.min(targetIndex, targetColumnGoals.length));

      if (sourceType === targetType && currentIndex === clampedIndex) {
        return state;
      }

      targetColumnGoals.splice(clampedIndex, 0, { ...goal, type: targetType });

      const orderUpdates = new Map<string, { type: string; kanbanOrder: number }>();
      targetColumnGoals.forEach((item, index) => {
        orderUpdates.set(item.id, { type: targetType, kanbanOrder: index });
      });

      if (sourceType !== targetType) {
        sortByKanbanOrder(
          state.goals.filter((item) => item.type === sourceType && item.id !== goalId)
        ).forEach((item, index) => {
          orderUpdates.set(item.id, { type: sourceType, kanbanOrder: index });
        });
      }

      return {
        goals: state.goals.map((item) => {
          const update = orderUpdates.get(item.id);
          return update ? { ...item, ...update } : item;
        }),
      };
    });
    persistGoalOrder(get);
  },

  openGoalForm: (goal) =>
    set({
      selectedGoal: goal || null,
      isGoalFormOpen: true,
      goalFormDraft: null,
    }),

  openGoalFormFromVoice: (draft) =>
    set({
      selectedGoal: null,
      isGoalFormOpen: true,
      goalFormDraft: draft,
    }),

  closeGoalForm: () =>
    set({
      selectedGoal: null,
      isGoalFormOpen: false,
      goalFormDraft: null,
    }),
});