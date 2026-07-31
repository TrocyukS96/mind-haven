import type {
  CategoryBreakdownItem,
  FinanceAccount,
  FinanceAccountInput,
  FinanceCurrency,
  FinancePeriod,
  FinanceTransaction,
  FinanceTransactionInput,
  TransactionType,
} from '@/entities/finance/model/types';
import { convertCurrency } from '@/entities/finance/lib/currency-converter';
import type { ExchangeRatesMap } from '@/shared/lib/finance/nbrb-exchange-service';
import {
  createFinanceAccountRequest,
  createFinanceTransactionRequest,
  deleteFinanceAccountRequest,
  deleteFinanceTransactionRequest,
  updateFinanceAccountRequest,
  updateFinanceTransactionRequest,
} from '@/entities/finance/api/finance-client';
import { shouldUseFinanceApi } from '@/entities/finance/lib/resolve-finance-api';
import type { TransactionFormDraft } from '@/features/finance/lib/map-voice-to-finance-draft';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

function recalculateAccountBalance(
  account: FinanceAccount,
  transactions: FinanceTransaction[]
): number {
  const accountTxs = transactions.filter((t) => t.accountId === account.id);
  return accountTxs.reduce((balance, tx) => {
    if (tx.type === 'income') return balance + tx.amount;
    return balance - tx.amount;
  }, account.initialBalance);
}

function withUpdatedBalances(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[]
): FinanceAccount[] {
  return accounts.map((account) => ({
    ...account,
    balance: recalculateAccountBalance(account, transactions),
  }));
}

export interface FinanceSlice {
  financeAccounts: FinanceAccount[];
  financeTransactions: FinanceTransaction[];
  financeApiEnabled: boolean;
  selectedAccountId: string | null;
  financePeriod: FinancePeriod;
  financeViewType: TransactionType;
  displayCurrency: FinanceCurrency;
  isAccountFormOpen: boolean;
  editingAccountId: string | null;
  isTransactionFormOpen: boolean;
  transactionFormType: TransactionType;
  editingTransactionId: string | null;
  transactionFormDraft: TransactionFormDraft | null;

  setFinanceApiEnabled: (enabled: boolean) => void;
  hydrateFinance: (data: { accounts: FinanceAccount[]; transactions: FinanceTransaction[] }) => void;
  setSelectedAccountId: (id: string | null) => void;
  setFinancePeriod: (period: FinancePeriod) => void;
  setFinanceViewType: (type: TransactionType) => void;
  setDisplayCurrency: (currency: FinanceCurrency) => void;
  addFinanceAccount: (input: FinanceAccountInput) => Promise<void>;
  updateFinanceAccount: (id: string, input: FinanceAccountInput) => Promise<void>;
  deleteFinanceAccount: (id: string) => Promise<void>;
  addFinanceTransaction: (input: FinanceTransactionInput) => Promise<void>;
  updateFinanceTransaction: (id: string, input: FinanceTransactionInput) => Promise<void>;
  deleteFinanceTransaction: (id: string) => Promise<void>;
  openAccountForm: () => void;
  openAccountFormForEdit: (id: string) => void;
  closeAccountForm: () => void;
  openTransactionForm: (type: TransactionType) => void;
  openTransactionFormForEdit: (id: string) => void;
  openTransactionFormFromVoice: (draft: TransactionFormDraft) => void;
  closeTransactionForm: () => void;
}

export const createFinanceSlice: StateCreator<AppStore, [], [], FinanceSlice> = (set, get) => ({
  financeAccounts: [],
  financeTransactions: [],
  financeApiEnabled: false,
  selectedAccountId: null,
  financePeriod: 'week',
  financeViewType: 'expense',
  displayCurrency: 'BYN',
  isAccountFormOpen: false,
  editingAccountId: null,
  isTransactionFormOpen: false,
  transactionFormType: 'expense',
  editingTransactionId: null,
  transactionFormDraft: null,

  setFinanceApiEnabled: (enabled) => set({ financeApiEnabled: enabled }),

  hydrateFinance: ({ accounts, transactions }) =>
    set({
      financeAccounts: withUpdatedBalances(accounts, transactions),
      financeTransactions: transactions,
      selectedAccountId: accounts[0]?.id ?? null,
    }),

  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  setFinancePeriod: (period) => set({ financePeriod: period }),
  setFinanceViewType: (type) => set({ financeViewType: type }),
  setDisplayCurrency: (currency) => set({ displayCurrency: currency }),

  addFinanceAccount: async (input) => {
    if (await shouldUseFinanceApi()) {
      const saved = await createFinanceAccountRequest(input);
      set((state) => {
        const accounts = [...state.financeAccounts, saved];
        return {
          financeAccounts: accounts,
          selectedAccountId: state.selectedAccountId ?? saved.id,
        };
      });
      return;
    }

    const localAccount: FinanceAccount = {
      id: `local-${Date.now()}`,
      name: input.name,
      currency: input.currency,
      initialBalance: input.initialBalance ?? 0,
      balance: input.initialBalance ?? 0,
    };

    set((state) => ({
      financeAccounts: [...state.financeAccounts, localAccount],
      selectedAccountId: state.selectedAccountId ?? localAccount.id,
    }));
  },

  updateFinanceAccount: async (id, input) => {
    if (await shouldUseFinanceApi()) {
      const saved = await updateFinanceAccountRequest(id, input);
      set((state) => {
        const accounts = state.financeAccounts.map((a) => (a.id === id ? saved : a));
        return {
          financeAccounts: withUpdatedBalances(accounts, state.financeTransactions),
        };
      });
      return;
    }

    set((state) => {
      const accounts = state.financeAccounts.map((a) =>
        a.id === id
          ? {
              ...a,
              name: input.name,
              currency: input.currency,
              initialBalance: input.initialBalance ?? 0,
            }
          : a
      );
      return {
        financeAccounts: withUpdatedBalances(accounts, state.financeTransactions),
      };
    });
  },

  deleteFinanceAccount: async (id) => {
    if (await shouldUseFinanceApi()) {
      await deleteFinanceAccountRequest(id);
    }

    set((state) => {
      const accounts = state.financeAccounts.filter((a) => a.id !== id);
      const transactions = state.financeTransactions.filter((t) => t.accountId !== id);
      const selectedAccountId =
        state.selectedAccountId === id ? (accounts[0]?.id ?? null) : state.selectedAccountId;

      return {
        financeAccounts: withUpdatedBalances(accounts, transactions),
        financeTransactions: transactions,
        selectedAccountId,
        editingAccountId: state.editingAccountId === id ? null : state.editingAccountId,
        isAccountFormOpen:
          state.editingAccountId === id ? false : state.isAccountFormOpen,
      };
    });
  },

  addFinanceTransaction: async (input) => {
    if (await shouldUseFinanceApi()) {
      const saved = await createFinanceTransactionRequest(input);
      set((state) => {
        const transactions = [saved, ...state.financeTransactions];
        return {
          financeTransactions: transactions,
          financeAccounts: withUpdatedBalances(state.financeAccounts, transactions),
        };
      });
      return;
    }

    const localTx: FinanceTransaction = {
      id: `local-${Date.now()}`,
      accountId: input.accountId,
      type: input.type,
      amount: input.amount,
      category: input.category,
      description: input.description ?? '',
      date: input.date,
    };

    set((state) => {
      const transactions = [localTx, ...state.financeTransactions];
      return {
        financeTransactions: transactions,
        financeAccounts: withUpdatedBalances(state.financeAccounts, transactions),
      };
    });
  },

  updateFinanceTransaction: async (id, input) => {
    if (await shouldUseFinanceApi()) {
      const saved = await updateFinanceTransactionRequest(id, input);
      set((state) => {
        const transactions = state.financeTransactions.map((t) => (t.id === id ? saved : t));
        return {
          financeTransactions: transactions,
          financeAccounts: withUpdatedBalances(state.financeAccounts, transactions),
        };
      });
      return;
    }

    set((state) => {
      const transactions = state.financeTransactions.map((t) =>
        t.id === id
          ? {
              ...t,
              accountId: input.accountId,
              type: input.type,
              amount: input.amount,
              category: input.category,
              description: input.description ?? '',
              date: input.date,
            }
          : t
      );
      return {
        financeTransactions: transactions,
        financeAccounts: withUpdatedBalances(state.financeAccounts, transactions),
      };
    });
  },

  deleteFinanceTransaction: async (id) => {
    if (await shouldUseFinanceApi()) {
      await deleteFinanceTransactionRequest(id);
    }

    set((state) => {
      const transactions = state.financeTransactions.filter((t) => t.id !== id);
      return {
        financeTransactions: transactions,
        financeAccounts: withUpdatedBalances(state.financeAccounts, transactions),
      };
    });
  },

  openAccountForm: () => set({ isAccountFormOpen: true, editingAccountId: null }),
  openAccountFormForEdit: (id) => {
    const account = get().financeAccounts.find((a) => a.id === id);
    if (!account) return;

    set({ isAccountFormOpen: true, editingAccountId: id });
  },
  closeAccountForm: () => set({ isAccountFormOpen: false, editingAccountId: null }),

  openTransactionForm: (type) =>
    set({
      isTransactionFormOpen: true,
      transactionFormType: type,
      editingTransactionId: null,
      transactionFormDraft: null,
    }),

  openTransactionFormForEdit: (id) => {
    const transaction = get().financeTransactions.find((t) => t.id === id);
    if (!transaction) return;

    set({
      isTransactionFormOpen: true,
      transactionFormType: transaction.type,
      editingTransactionId: id,
      transactionFormDraft: null,
    });
  },

  openTransactionFormFromVoice: (draft) =>
    set({
      isTransactionFormOpen: true,
      transactionFormType: draft.type,
      editingTransactionId: null,
      transactionFormDraft: draft,
    }),

  closeTransactionForm: () =>
    set({
      isTransactionFormOpen: false,
      editingTransactionId: null,
      transactionFormDraft: null,
    }),
});

export function getPeriodRange(period: FinancePeriod, referenceDate = new Date()): {
  start: Date;
  end: Date;
} {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);

  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'day':
      break;
    case 'week': {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'month':
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

export function filterTransactionsByPeriod(
  transactions: FinanceTransaction[],
  period: FinancePeriod,
  referenceDate = new Date()
): FinanceTransaction[] {
  const { start, end } = getPeriodRange(period, referenceDate);

  return transactions.filter((tx) => {
    const date = new Date(`${tx.date}T12:00:00`);
    return date >= start && date <= end;
  });
}

export function getCategoryBreakdown(
  transactions: FinanceTransaction[],
  type: TransactionType
): CategoryBreakdownItem[] {
  const filtered = transactions.filter((t) => t.type === type);
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  if (total === 0) return [];

  const map = new Map<string, number>();
  for (const tx of filtered) {
    map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
  }

  return Array.from(map.entries())
    .map(([category, amount]) => ({
      category: category as CategoryBreakdownItem['category'],
      amount,
      percentage: Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}

function getAccountCurrencyMap(accounts: FinanceAccount[]): Map<string, FinanceCurrency> {
  return new Map(accounts.map((account) => [account.id, account.currency]));
}

export function getCategoryBreakdownConverted(
  transactions: FinanceTransaction[],
  accounts: FinanceAccount[],
  type: TransactionType,
  targetCurrency: FinanceCurrency,
  rates: ExchangeRatesMap
): CategoryBreakdownItem[] {
  const accountCurrencies = getAccountCurrencyMap(accounts);
  const filtered = transactions.filter((t) => t.type === type);
  const map = new Map<string, number>();

  for (const tx of filtered) {
    const fromCurrency = accountCurrencies.get(tx.accountId) ?? 'BYN';
    const converted = convertCurrency(tx.amount, fromCurrency, targetCurrency, rates);
    map.set(tx.category, (map.get(tx.category) ?? 0) + converted);
  }

  const total = Array.from(map.values()).reduce((sum, value) => sum + value, 0);
  if (total === 0) return [];

  return Array.from(map.entries())
    .map(([category, amount]) => ({
      category: category as CategoryBreakdownItem['category'],
      amount,
      percentage: Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getTotalBalanceConverted(
  accounts: FinanceAccount[],
  targetCurrency: FinanceCurrency,
  rates: ExchangeRatesMap
): number {
  return accounts.reduce((sum, account) => {
    return sum + convertCurrency(account.balance, account.currency, targetCurrency, rates);
  }, 0);
}

export function getAccountBalanceConverted(
  account: FinanceAccount,
  targetCurrency: FinanceCurrency,
  rates: ExchangeRatesMap
): number {
  return convertCurrency(account.balance, account.currency, targetCurrency, rates);
}
