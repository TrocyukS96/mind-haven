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
import { normalizePersistedFinanceState } from '@/shared/lib/finance/finance-books';
import { rebalance } from '@/shared/lib/finance/capital-ledger';
import type { FinanceAccount, FinanceBooks, FinanceCapitalGoal, FinanceAccountPurposeChange, FinanceTransaction, FinanceTransfer } from '@/entities/finance/model/types';
import { createEnergySlice, EnergySlice } from './slices/energy-slice';
import { createActivitySlice, ActivitySlice } from './slices/activity-slice';
import { createProjectsSlice, ProjectsSlice } from './slices/projects-slice';
export type AppStore = HabitsSlice & GoalsSlice & JournalSlice & TablesSlice & AppSlice & TasksSlice & PointsSlice & FinanceSlice & EnergySlice & ActivitySlice & ProjectsSlice;

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
        ...createProjectsSlice(...args),
      }),
      {
        name: 'mindhaven-storage',
        version: 1,
        migrate: (persistedState) => {
          const state = normalizePersistedFinanceState(
            (persistedState ?? {}) as Record<string, unknown>
          ) as Record<string, unknown> & {
            financeAccounts: FinanceAccount[];
            financeTransactions: FinanceTransaction[];
            financeTransfers: FinanceTransfer[];
            financePurposeChanges: FinanceAccountPurposeChange[];
            financeCapitalGoals: FinanceCapitalGoal[];
          };
          const books: FinanceBooks = rebalance({
            accounts: state.financeAccounts ?? [],
            transactions: state.financeTransactions ?? [],
            transfers: state.financeTransfers ?? [],
            purposeChanges: state.financePurposeChanges ?? [],
            goals: state.financeCapitalGoals ?? [],
          });
          return {
            ...state,
            financeAccounts: books.accounts,
            financeTransactions: books.transactions,
            financeTransfers: books.transfers,
            financePurposeChanges: books.purposeChanges,
            financeCapitalGoals: books.goals,
          };
        },
        partialize: (state) => {
          const {
            journalApiEnabled: _journalApiEnabled,
            habitsApiEnabled: _habitsApiEnabled,
            plannerApiEnabled: _plannerApiEnabled,
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
            editingHabit: _editingHabit,
            habitFormDraft: _habitFormDraft,
            isAccountFormOpen: _isAccountFormOpen,
            accountFormPurpose: _accountFormPurpose,
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