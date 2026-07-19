import { Habit } from '@/entities/habit/model/types';
import {
  buildHabitDayEvent,
  buildHabitStreakEvent,
} from '@/entities/points/lib/calculate-points';
import { tryEarnPoints, tryEarnPointsMany } from '@/entities/points/lib/process-point-event';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

const initialHabits: Habit[] = [];

export interface HabitsSlice {
  habits: Habit[];
  isHabitFormOpen: boolean;

  addHabit: (habit: Omit<Habit, 'id' | 'streak' | 'completedDays'>) => void;
  toggleHabitDay: (id: string, date: string) => void;
  deleteHabit: (id: string) => void;
  openHabitForm: () => void;
  closeHabitForm: () => void;
}

export const createHabitsSlice: StateCreator<AppStore, [], [], HabitsSlice> = (set, get) => ({
  habits: initialHabits,
  isHabitFormOpen: false,

  addHabit: (habit) =>
    set((state) => ({
      habits: [
        ...state.habits,
        { ...habit, id: Date.now().toString(), streak: 0, completedDays: [] },
      ],
    })),

  toggleHabitDay: (id, date) => {
    const habit = get().habits.find((item) => item.id === id);
    if (!habit) return;

    const wasCompleted = habit.completedDays.includes(date);
    const nextStreak = wasCompleted ? Math.max(0, habit.streak - 1) : habit.streak + 1;

    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id !== id) return h;
        const completedDays = wasCompleted
          ? h.completedDays.filter((d) => d !== date)
          : [...h.completedDays, date];
        return {
          ...h,
          completedDays,
          streak: nextStreak,
        };
      }),
    }));

    if (!wasCompleted) {
      tryEarnPointsMany(get, [
        buildHabitDayEvent(id, date),
        buildHabitStreakEvent(id, nextStreak),
      ]);
    }
  },

  deleteHabit: (id) =>
    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
    })),

  openHabitForm: () => set({ isHabitFormOpen: true }),

  closeHabitForm: () => set({ isHabitFormOpen: false }),
});
