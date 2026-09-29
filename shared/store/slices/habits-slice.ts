import { buildActivityInput } from '@/entities/activity/lib/build-activity-input';
import { Habit } from '@/entities/habit/model/types';
import {
  createHabitRequest,
  deleteHabitRequest,
  setHabitDayCountRequest,
  toggleHabitDayRequest,
  updateHabitRequest,
} from '@/entities/habit/api/habit-client';
import { shouldUseHabitApi } from '@/entities/habit/lib/resolve-habit-api';
import type { HabitFormDraft } from '@/features/habit/lib/map-voice-to-habit-draft';
import {
  buildHabitDayEvent,
  buildHabitStreakEvent,
} from '@/entities/points/lib/calculate-points';
import { tryEarnPointsMany } from '@/entities/points/lib/process-point-event';
import { calculateHabitStreak, getHabitToday } from '@/shared/lib/habit/habit-date';
import { isHabitScheduledOn } from '@/shared/lib/habit/habit-weekdays';
import {
  applyDayCount,
  completedDaysFromCounts,
  ensureHabitShape,
  isHabitDayMet,
  normalizeDayCount,
  realignHabitProgress,
} from '@/shared/lib/habit/habit-progress';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

const initialHabits: Habit[] = [];

export interface HabitsSlice {
  habits: Habit[];
  habitsApiEnabled: boolean;
  isHabitFormOpen: boolean;
  habitFormDraft: HabitFormDraft | null;
  editingHabit: Habit | null;

  setHabitApiEnabled: (enabled: boolean) => void;
  hydrateHabits: (habits: Habit[]) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'streak' | 'completedDays' | 'dayCounts'>) => Promise<void>;
  updateHabit: (id: string, habit: Omit<Habit, 'id' | 'streak' | 'completedDays' | 'dayCounts'>) => Promise<void>;
  toggleHabitDay: (id: string, date: string) => Promise<void>;
  setHabitDayCount: (id: string, date: string, count: number) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  openHabitForm: (habit?: Habit) => void;
  openHabitFormFromVoice: (draft: HabitFormDraft) => void;
  closeHabitForm: () => void;
}

export const createHabitsSlice: StateCreator<AppStore, [], [], HabitsSlice> = (set, get) => ({
  habits: initialHabits,
  habitsApiEnabled: false,
  isHabitFormOpen: false,
  habitFormDraft: null,
  editingHabit: null,

  setHabitApiEnabled: (enabled) => set({ habitsApiEnabled: enabled }),

  hydrateHabits: (habits) => set({ habits: habits.map(ensureHabitShape) }),

  addHabit: async (habit) => {
    const draft = {
      name: habit.name,
      frequency: habit.frequency,
      trackingType: habit.trackingType ?? 'check',
      targetCount: habit.trackingType === 'check' ? null : habit.targetCount,
    };

    if (await shouldUseHabitApi()) {
      const savedHabit = await createHabitRequest(draft);
      set((state) => ({
        habits: [...state.habits, ensureHabitShape(savedHabit)],
      }));
      return;
    }

    const id = Date.now().toString();
    set((state) => ({
      habits: [
        ...state.habits,
        { ...draft, id, streak: 0, completedDays: [], dayCounts: {} },
      ],
    }));

    void get().recordActivity(
      buildActivityInput({
        type: 'HABIT_CREATED',
        entityId: id,
        title: habit.name,
        idempotencyKey: `habit:${id}:created`,
      })
    );
  },

  updateHabit: async (id, habit) => {
    const found = get().habits.find((item) => item.id === id);
    if (!found) return;

    const current = ensureHabitShape(found);
    const trackingType = habit.trackingType ?? 'check';
    const draft = {
      name: habit.name,
      frequency: habit.frequency,
      trackingType,
      targetCount: trackingType === 'check' ? null : habit.targetCount,
    };

    if (await shouldUseHabitApi()) {
      const savedHabit = ensureHabitShape(await updateHabitRequest(id, draft));
      set((state) => ({
        habits: state.habits.map((item) => (item.id === id ? savedHabit : item)),
      }));
      return;
    }

    const progress = realignHabitProgress(current, draft.frequency, draft.targetCount);
    set((state) => ({
      habits: state.habits.map((item) =>
        item.id === id ? { ...current, ...draft, ...progress } : item
      ),
    }));
  },

  toggleHabitDay: async (id, date) => {
    const found = get().habits.find((item) => item.id === id);
    if (!found) return;

    const habit = ensureHabitShape(found);
    if (habit.targetCount != null) return;
    if (!isHabitScheduledOn(habit.frequency, date)) return;

    const wasCompleted = habit.completedDays.includes(date);

    if (await shouldUseHabitApi()) {
      const updated = ensureHabitShape(await toggleHabitDayRequest(id, date));
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

    const completedDays = wasCompleted
      ? habit.completedDays.filter((day) => day !== date)
      : [...habit.completedDays, date];
    const nextStreak = calculateHabitStreak(completedDays, getHabitToday(), (day) =>
      isHabitScheduledOn(habit.frequency, day)
    );

    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id
          ? {
              ...habit,
              completedDays,
              streak: nextStreak,
            }
          : h
      ),
    }));

    if (!wasCompleted) {
      tryEarnPointsMany(get, [
        buildHabitDayEvent(id, date),
        buildHabitStreakEvent(id, nextStreak),
      ]);
      void get().recordActivity(
        buildActivityInput({
          type: 'HABIT_COMPLETED',
          entityId: id,
          title: habit.name,
          metadata: { date },
          idempotencyKey: `habit:${id}:completed:${date}`,
        })
      );
    }
  },

  setHabitDayCount: async (id, date, count) => {
    const found = get().habits.find((item) => item.id === id);
    if (!found) return;

    const habit = ensureHabitShape(found);
    if (habit.targetCount == null) return;
    if (!isHabitScheduledOn(habit.frequency, date)) return;

    const normalizedCount = normalizeDayCount(count);
    const wasCompleted = isHabitDayMet(habit, date);

    if (await shouldUseHabitApi()) {
      const updated = ensureHabitShape(await setHabitDayCountRequest(id, date, normalizedCount));
      set((state) => ({
        habits: state.habits.map((item) => (item.id === id ? updated : item)),
      }));

      if (!wasCompleted && isHabitDayMet(updated, date)) {
        tryEarnPointsMany(get, [
          buildHabitDayEvent(id, date),
          buildHabitStreakEvent(id, updated.streak),
        ]);
      }
      return;
    }

    const dayCounts = applyDayCount(habit.dayCounts, date, normalizedCount);
    const completedDays = completedDaysFromCounts(dayCounts, habit.targetCount, habit.frequency);
    const nextStreak = calculateHabitStreak(completedDays, getHabitToday(), (day) =>
      isHabitScheduledOn(habit.frequency, day)
    );
    const nextHabit: Habit = {
      ...habit,
      dayCounts,
      completedDays,
      streak: nextStreak,
    };

    set((state) => ({
      habits: state.habits.map((item) => (item.id === id ? nextHabit : item)),
    }));

    if (!wasCompleted && isHabitDayMet(nextHabit, date)) {
      tryEarnPointsMany(get, [
        buildHabitDayEvent(id, date),
        buildHabitStreakEvent(id, nextStreak),
      ]);
      void get().recordActivity(
        buildActivityInput({
          type: 'HABIT_COMPLETED',
          entityId: id,
          title: habit.name,
          metadata: { date, count: normalizedCount },
          idempotencyKey: `habit:${id}:completed:${date}`,
        })
      );
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

  openHabitForm: (habit) =>
    set({
      isHabitFormOpen: true,
      habitFormDraft: null,
      editingHabit: habit ?? null,
    }),

  openHabitFormFromVoice: (draft) =>
    set({
      isHabitFormOpen: true,
      habitFormDraft: draft,
      editingHabit: null,
    }),

  closeHabitForm: () =>
    set({
      isHabitFormOpen: false,
      habitFormDraft: null,
      editingHabit: null,
    }),
});
