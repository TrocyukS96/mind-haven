import { Habit } from '@/entities/habit/model/types';
import { create, StateCreator } from 'zustand';

const initialHabits: Habit[] = [
    {
      id: '1',
      name: 'Медитация',
      frequency: 'Ежедневно',
      streak: 7,
      completedDays: ['2025-11-19', '2025-11-18', '2025-11-17', '2025-11-16'],
    },
    {
      id: '2',
      name: 'Чтение книг',
      frequency: 'Ежедневно',
      streak: 12,
      completedDays: ['2025-11-19', '2025-11-18', '2025-11-17'],
    },
  ];
  

export interface HabitsSlice {
    habits: Habit[];
    addHabit: (habit: Omit<Habit, 'id' | 'streak' | 'completedDays'>) => void;
    toggleHabitDay: (id: string, date: string) => void;
}

export const createHabitsSlice: StateCreator<HabitsSlice> = (set) => ({
  habits: initialHabits,
  addHabit: (habit) =>
    set((state) => ({
      habits: [...state.habits, { ...habit, id: Date.now().toString(), streak: 0, completedDays: [] }],
    })),

  toggleHabitDay: (id, date) =>
    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id !== id) return h;
        const completed = h.completedDays.includes(date);
        const completedDays = completed
          ? h.completedDays.filter((d) => d !== date)
          : [...h.completedDays, date];
        return {
          ...h,
          completedDays,
          streak: completed ? Math.max(0, h.streak - 1) : h.streak + 1,
        };
      }),
    })),
});

export const useHabitsStore = create<HabitsSlice>()(createHabitsSlice);