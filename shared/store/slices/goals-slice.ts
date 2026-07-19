import { Goal } from '@/entities/goal/model/types';
import { getGoalCategoryFromDeadline } from '@/entities/goal/lib/get-goal-category-from-deadline';
import { sortByKanbanOrder } from '@/shared/lib/kanban-utils';
import { StateCreator } from 'zustand';

const initialGoals: Goal[] = [];

export interface GoalsSlice {
  goals: Goal[];
  goalsKanbanColumnOrder: string[];

  addGoal: (goal: Omit<Goal, 'id' | 'progress' | 'category'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  updateGoalProgress: (id: string, progress: number) => void;
  reorderGoalsKanbanColumns: (columnKeys: string[]) => void;
  moveGoalInKanban: (goalId: string, targetType: string, targetIndex: number) => void;

  selectedGoal: Goal | null;
  isGoalFormOpen: boolean;
  openGoalForm: (goal?: Goal) => void;
  closeGoalForm: () => void;
}

export const createGoalsSlice: StateCreator<GoalsSlice> = (set) => ({
  goals: initialGoals,
  goalsKanbanColumnOrder: [],
  selectedGoal: null,
  isGoalFormOpen: false,

  addGoal: (goal) =>
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
            id: Date.now().toString(),
            progress: 0,
            kanbanOrder: maxOrder + 1,
          },
        ],
      };
    }),

  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((g) => {
        if (g.id !== id) return g;

        const next = { ...g, ...updates };
        if (updates.deadline !== undefined) {
          next.category = getGoalCategoryFromDeadline(updates.deadline);
        }
        return next;
      }),
    })),

  deleteGoal: (id) =>
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    })),

  updateGoalProgress: (id, progress) =>
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, progress } : g
      ),
    })),

  reorderGoalsKanbanColumns: (columnKeys) =>
    set({ goalsKanbanColumnOrder: columnKeys }),

  moveGoalInKanban: (goalId, targetType, targetIndex) =>
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
    }),

  openGoalForm: (goal) =>
    set({
      selectedGoal: goal || null,
      isGoalFormOpen: true,
    }),

  closeGoalForm: () =>
    set({
      selectedGoal: null,
      isGoalFormOpen: false,
    }),
});