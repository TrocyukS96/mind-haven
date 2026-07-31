import { Habit } from '@/entities/habit/model/types';
import {
  createHabitRequest,
  deleteHabitRequest,
  toggleHabitDayRequest,
} from '@/entities/habit/api/habit-client';
import { shouldUseHabitApi } from '@/entities/habit/lib/resolve-habit-api';
import type { HabitFormDraft } from '@/features/habit/lib/map-voice-to-habit-draft';
import {
  buildHabitDayEvent,
  buildHabitStreakEvent,
} from '@/entities/points/lib/calculate-points';
import { tryEarnPointsMany } from '@/entities/points/lib/process-point-event';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

const initialHabits: Habit[] = [];

export interface HabitsSlice {
  habits: Habit[];
  habitsApiEnabled: boolean;
  isHabitFormOpen: boolean;
  habitFormDraft: HabitFormDraft | null;

  setHabitApiEnabled: (enabled: boolean) => void;
  hydrateHabits: (habits: Habit[]) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'streak' | 'completedDays'>) => Promise<void>;
  toggleHabitDay: (id: string, date: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  openHabitForm: () => void;
  openHabitFormFromVoice: (draft: HabitFormDraft) => void;
  closeHabitForm: () => void;
}

export const createHabitsSlice: StateCreator<AppStore, [], [], HabitsSlice> = (set, get) => ({
  habits: initialHabits,
  habitsApiEnabled: false,
  isHabitFormOpen: false,
  habitFormDraft: null,

  setHabitApiEnabled: (enabled) => set({ habitsApiEnabled: enabled }),

  hydrateHabits: (habits) => set({ habits }),

  addHabit: async (habit) => {
    if (await shouldUseHabitApi()) {
      const savedHabit = await createHabitRequest(habit);
      set((state) => ({
        habits: [...state.habits, savedHabit],
      }));
      return;
    }

    set((state) => ({
      habits: [
        ...state.habits,
        { ...habit, id: Date.now().toString(), streak: 0, completedDays: [] },
      ],
    }));
  },

  toggleHabitDay: async (id, date) => {
    const habit = get().habits.find((item) => item.id === id);
    if (!habit) return;

    const wasCompleted = habit.completedDays.includes(date);

    if (await shouldUseHabitApi()) {
      const updated = await toggleHabitDayRequest(id, date);
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? updated : h)),
      }));

      if (!wasCompleted) {
        tryEarnPointsMany(get, [
          buildHabitDayEvent(id, date),
          buildHabitStreakEvent(id, updated.streak),
        ]);
      }
      return;
    }

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

  deleteHabit: async (id) => {
    if (await shouldUseHabitApi()) {
      await deleteHabitRequest(id);
    }

    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
    }));
  },

  openHabitForm: () =>
    set({
      isHabitFormOpen: true,
      habitFormDraft: null,
    }),

  openHabitFormFromVoice: (draft) =>
    set({
      isHabitFormOpen: true,
      habitFormDraft: draft,
    }),

  closeHabitForm: () =>
    set({
      isHabitFormOpen: false,
      habitFormDraft: null,
    }),
});
