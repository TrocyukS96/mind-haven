import { Goal } from '@/entities/goal/model/types';
import { StateCreator } from 'zustand';

const initialGoals: Goal[] = [];

export interface GoalsSlice {
  goals: Goal[];

  addGoal: (goal: Omit<Goal, 'id' | 'progress'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  updateGoalProgress: (id: string, progress: number) => void;

  selectedGoal: Goal | null;
  isGoalFormOpen: boolean;
  openGoalForm: (goal?: Goal) => void;
  closeGoalForm: () => void;
}

export const createGoalsSlice: StateCreator<GoalsSlice> = (set) => ({
  goals: initialGoals,
  selectedGoal: null,
  isGoalFormOpen: false,

  addGoal: (goal) =>
    set((state) => ({
      goals: [...state.goals, { ...goal, id: Date.now().toString(), progress: 0 }],
    })),

  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
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