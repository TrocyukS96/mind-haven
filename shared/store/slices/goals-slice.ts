import { Goal } from '@/entities/goal/model/types';
import { create, StateCreator } from 'zustand';

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
  updateGoalProgress: (id: string, progress: number) => void;

  isCreateGoalModalOpen: boolean;
  setIsCreateGoalModalOpen: (open: boolean) => void;
}

export const createGoalsSlice: StateCreator<GoalsSlice> = (set) => ({
  goals: initialGoals,
  addGoal: (goal) =>
    set((state) => ({
      goals: [...state.goals, { ...goal, id: Date.now().toString(), progress: 0 }],
    })),

  updateGoalProgress: (id, progress) =>
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, progress } : g)),
    })),

  isCreateGoalModalOpen: false,
  setIsCreateGoalModalOpen: (open) =>
    set({ isCreateGoalModalOpen: open }),
});

export const useGoalsStore = create<GoalsSlice>()(createGoalsSlice);