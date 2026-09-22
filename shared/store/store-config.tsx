'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createGoalsSlice, GoalsSlice } from './slices/goals-slice';
import { createHabitsSlice, HabitsSlice } from './slices/habits-slice';
import { createJournalSlice, JournalSlice } from './slices/journal-slice';
import { createTablesSlice, TablesSlice } from './slices/table-slice';
import { createAppSlice, AppSlice } from './slices/app-slice';
import { createTasksSlice, TasksSlice } from './slices/tasks-slice';
import { createPointsSlice, PointsSlice } from './slices/points-slice';
import { createFinanceSlice, FinanceSlice } from './slices/finance-slice';
import { createEnergySlice, EnergySlice } from './slices/energy-slice';
import { createActivitySlice, ActivitySlice } from './slices/activity-slice';
export type AppStore = HabitsSlice & GoalsSlice & JournalSlice & TablesSlice & AppSlice & TasksSlice & PointsSlice & FinanceSlice & EnergySlice & ActivitySlice;

export const useStore = create<AppStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createJournalSlice(...args),
        ...createGoalsSlice(...args),
        ...createHabitsSlice(...args),
        ...createTablesSlice(...args),
        ...createAppSlice(...args),
        ...createTasksSlice(...args),
        ...createPointsSlice(...args),
        ...createFinanceSlice(...args),
        ...createEnergySlice(...args),
        ...createActivitySlice(...args),
      }),
      {
        name: 'mindhaven-storage',
        partialize: (state) => {
          const {
            journalApiEnabled: _journalApiEnabled,
            habitsApiEnabled: _habitsApiEnabled,
            energyApiEnabled: _energyApiEnabled,
            activityApiEnabled: _activityApiEnabled,
            isEnergyCheckInOpen: _isEnergyCheckInOpen,
            viewedEnergyCheckIn: _viewedEnergyCheckIn,
            isActivityLoading: _isActivityLoading,
            isActivityLoadingMore: _isActivityLoadingMore,
            activityNextCursor: _activityNextCursor,
            hasLoadedActivity: _hasLoadedActivity,
            energyTest: _energyTest,
            selectedJournalEntry: _selectedJournalEntry,
            isJournalFormOpen: _isJournalFormOpen,
            isHabitFormOpen: _isHabitFormOpen,
            isAccountFormOpen: _isAccountFormOpen,
            isTransactionFormOpen: _isTransactionFormOpen,
            editingTransactionId: _editingTransactionId,
            transactionFormDraft: _transactionFormDraft,
            ...persistedState
          } = state;

          return persistedState;
        },
      }
    )
  )
);