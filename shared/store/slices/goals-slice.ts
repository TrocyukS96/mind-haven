import { Goal } from '@/entities/goal/model/types';
import { StateCreator } from 'zustand';

const initialGoals: Goal[] = [
  {
    id: '1',
    title: 'Прочитать 12 книг',
    description: 'Читать минимум 1 книгу в месяц для расширения кругозора',
    progress: 40,
    deadline: '2025-12-31',
    category: 'year',
  },
  {
    id: '2',
    title: 'Запустить свой проект',
    description: 'Разработать и запустить веб-приложение для саморазвития',
    progress: 65,
    deadline: '2025-12-15',
    category: 'month',
  },
];

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