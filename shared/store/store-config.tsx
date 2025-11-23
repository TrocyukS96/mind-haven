'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createGoalsSlice, GoalsSlice } from './slices/goals-slice';
import { createHabitsSlice, HabitsSlice } from './slices/habits-slice';
import { createJournalSlice, JournalSlice } from './slices/journal-slice';
import { createTablesSlice, TablesSlice } from './slices/table-slice';
import { createAppSlice, AppSlice } from './slices/app-slice';

type AppStore = HabitsSlice & GoalsSlice & JournalSlice & TablesSlice & AppSlice;

export const useStore = create<AppStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createJournalSlice(...args),
        ...createGoalsSlice(...args),
        ...createHabitsSlice(...args),
        ...createTablesSlice(...args),
        ...createAppSlice(...args),
      }),
      {
        name: 'mindhaven-storage', // всё сохраняется между сессиями
      }
    )
  )
);