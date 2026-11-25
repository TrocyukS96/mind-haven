import type {
  AccountPurpose,
  CategoryBreakdownItem,
  FinanceAccount,
  FinanceAccountInput,
  FinanceAccountPurposeChange,
  FinanceBooks,
  FinanceCapitalGoal,
  FinanceCurrency,
  FinancePeriod,
  FinanceTransaction,
  FinanceTransactionInput,
  FinanceTransfer,
  TransactionType,
} from '@/entities/finance/model/types';
import { convertCurrency } from '@/entities/finance/lib/currency-converter';
import type { ExchangeRatesMap } from '@/shared/lib/finance/nbrb-exchange-service';
import {
  archiveFinanceAccountRequest,
  archiveFinanceGoalRequest,
  celebrateFinanceGoalRequest,
  createCapitalMovementRequest,
  createFinanceAccountRequest,
  createFinanceGoalRequest,
  createFinanceTransactionRequest,
  createFinanceTransferRequest,
  deleteFinanceAccountRequest,
  deleteFinanceGoalRequest,
  deleteFinanceTransactionRequest,
  deleteFinanceTransferRequest,
  setDefaultFinanceAccountRequest,
  updateCapitalMovementRequest,
  updateFinanceAccountRequest,
  updateFinanceGoalRequest,
  updateFinanceTransactionRequest,
  updateFinanceTransferRequest,
} from '@/entities/finance/api/finance-client';
import { shouldUseFinanceApi } from '@/entities/finance/lib/resolve-finance-api';
import type { TransactionFormDraft } from '@/features/finance/lib/map-voice-to-finance-draft';
import {
  archiveAccount,
  archiveGoal,
  celebrateGoal,
  createAccount,
  createCapitalMovement,
  createGoal,
  createRegularTransaction,
  createTransfer,
  deleteAccount,
  deleteGoal,
  deleteTransaction,
  deleteTransfer,
  isRegularAccount,
  rebalance,
  setDefaultAccount,
  updateAccount,
  updateCapitalMovement,
  updateGoal,
  updateRegularTransaction,
  updateTransfer,
  type CapitalMovementInput,
  type GoalInput,
  type LedgerResult,
  type TransferInput,
} from '@/shared/lib/finance/capital-ledger';
import { normalizeBooks } from '@/shared/lib/finance/finance-books';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

export interface FinanceSlice {
  financeAccounts: FinanceAccount[];
  financeTransactions: FinanceTransaction[];
  financeTransfers: FinanceTransfer[];
  financePurposeChanges: FinanceAccountPurposeChange[];
  financeCapitalGoals: FinanceCapitalGoal[];
  financeApiEnabled: boolean;
  selectedAccountId: string | null;
  financePeriod: FinancePeriod;
  financeViewType: TransactionType;
  displayCurrency: FinanceCurrency;
  isAccountFormOpen: boolean;
  editingAccountId: string | null;
  accountFormPurpose: AccountPurpose;
  isTransactionFormOpen: boolean;
  transactionFormType: TransactionType;
  editingTransactionId: string | null;
  transactionFormDraft: TransactionFormDraft | null;

  setFinanceApiEnabled: (enabled: boolean) => void;
  hydrateFinance: (data: Partial<FinanceBooks>) => void;
  setSelectedAccountId: (id: string | null) => void;
  setFinancePeriod: (period: FinancePeriod) => void;
  setFinanceViewType: (type: TransactionType) => void;
  setDisplayCurrency: (currency: FinanceCurrency) => void;
  addFinanceAccount: (input: FinanceAccountInput & { date?: string }) => Promise<void>;
  updateFinanceAccount: (id: string, input: FinanceAccountInput) => Promise<void>;
  setDefaultFinanceAccount: (id: string | null) => Promise<void>;
  deleteFinanceAccount: (id: string) => Promise<void>;
  archiveFinanceAccount: (id: string) => Promise<void>;
  addFinanceTransaction: (input: FinanceTransactionInput) => Promise<void>;
  updateFinanceTransaction: (id: string, input: FinanceTransactionInput) => Promise<void>;
  deleteFinanceTransaction: (id: string) => Promise<void>;
  addFinanceTransfer: (input: TransferInput) => Promise<void>;
  updateFinanceTransfer: (id: string, input: TransferInput) => Promise<void>;
  deleteFinanceTransfer: (id: string) => Promise<void>;
  addCapitalMovement: (input: CapitalMovementInput) => Promise<void>;
  updateCapitalMovement: (id: string, input: CapitalMovementInput) => Promise<void>;
  addCapitalGoal: (input: GoalInput) => Promise<void>;
  updateCapitalGoal: (id: string, input: GoalInput) => Promise<void>;
  archiveCapitalGoal: (id: string) => Promise<void>;
  deleteCapitalGoal: (id: string) => Promise<void>;
  celebrateCapitalGoal: (id: string) => Promise<void>;
  openAccountForm: (purpose?: AccountPurpose) => void;
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
  financeTransfers: [],
  financePurposeChanges: [],
  financeCapitalGoals: [],
  financeApiEnabled: false,
  selectedAccountId: null,
  financePeriod: 'week',
  financeViewType: 'expense',
  displayCurrency: 'BYN',
  isAccountFormOpen: false,
  editingAccountId: null,
  accountFormPurpose: 'REGULAR',
  isTransactionFormOpen: false,
  transactionFormType: 'expense',
  editingTransactionId: null,
  transactionFormDraft: null,

  setFinanceApiEnabled: (enabled) => set({ financeApiEnabled: enabled }),

  hydrateFinance: (data) => {
    const books = rebalance(normalizeBooks(data));
    set({
      ...booksToState(books),
      selectedAccountId: getDefaultAccountId(books.accounts),
    });
  },

  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  setFinancePeriod: (period) => set({ financePeriod: period }),
  setFinanceViewType: (type) => set({ financeViewType: type }),
  setDisplayCurrency: (currency) => set({ displayCurrency: currency }),

  addFinanceAccount: async (input) => {
    await commitFinance(get, set, () => createFinanceAccountRequest(input), (books) =>
      createAccount(books, input)
    );
  },

  updateFinanceAccount: async (id, input) => {
    await commitFinance(get, set, () => updateFinanceAccountRequest(id, input), (books) =>
      updateAccount(books, id, input)
    );
  },

  setDefaultFinanceAccount: async (id) => {
    if (id && !get().financeAccounts.some((account) => account.id === id)) return;
    await commitFinance(get, set, () => setDefaultFinanceAccountRequest(id), (books) =>
      setDefaultAccount(books, id)
    );
    set({ selectedAccountId: id });
  },

  deleteFinanceAccount: async (id) => {
    await commitFinance(get, set, () => deleteFinanceAccountRequest(id), (books) =>
      deleteAccount(books, id)
    );
  },

  archiveFinanceAccount: async (id) => {
    await commitFinance(get, set, () => archiveFinanceAccountRequest(id), (books) =>
      archiveAccount(books, id)
    );
  },

  addFinanceTransaction: async (input) => {
    await commitFinance(get, set, () => createFinanceTransactionRequest(input), (books) =>
      createRegularTransaction(books, input)
    );
  },

  updateFinanceTransaction: async (id, input) => {
    await commitFinance(get, set, () => updateFinanceTransactionRequest(id, input), (books) =>
      updateRegularTransaction(books, id, input)
    );
  },

  deleteFinanceTransaction: async (id) => {
    await commitFinance(get, set, () => deleteFinanceTransactionRequest(id), (books) =>
      deleteTransaction(books, id)
    );
  },

  addFinanceTransfer: async (input) => {
    await commitFinance(get, set, () => createFinanceTransferRequest(input), (books) =>
      createTransfer(books, input)
    );
  },

  updateFinanceTransfer: async (id, input) => {
    await commitFinance(get, set, () => updateFinanceTransferRequest(id, input), (books) =>
      updateTransfer(books, id, input)
    );
  },

  deleteFinanceTransfer: async (id) => {
    await commitFinance(get, set, () => deleteFinanceTransferRequest(id), (books) =>
      deleteTransfer(books, id)
    );
  },

  addCapitalMovement: async (input) => {
    await commitFinance(get, set, () => createCapitalMovementRequest(input), (books) =>
      createCapitalMovement(books, input)
    );
  },

  updateCapitalMovement: async (id, input) => {
    await commitFinance(get, set, () => updateCapitalMovementRequest(id, input), (books) =>
      updateCapitalMovement(books, id, input)
    );
  },

  addCapitalGoal: async (input) => {
    await commitFinance(get, set, () => createFinanceGoalRequest(input), (books) =>
      createGoal(books, input)
    );
  },

  updateCapitalGoal: async (id, input) => {
    await commitFinance(get, set, () => updateFinanceGoalRequest(id, input), (books) =>
      updateGoal(books, id, input)
    );
  },

  archiveCapitalGoal: async (id) => {
    await commitFinance(get, set, () => archiveFinanceGoalRequest(id), (books) =>
      archiveGoal(books, id)
    );
  },

  deleteCapitalGoal: async (id) => {
    await commitFinance(get, set, () => deleteFinanceGoalRequest(id), (books) => deleteGoal(books, id));
  },

  celebrateCapitalGoal: async (id) => {
    await commitFinance(get, set, () => celebrateFinanceGoalRequest(id), (books) =>
      celebrateGoal(books, id)
    );
  },

  openAccountForm: (purpose = 'REGULAR') =>
    set({ isAccountFormOpen: true, editingAccountId: null, accountFormPurpose: purpose }),
  openAccountFormForEdit: (id) => {
    const account = get().financeAccounts.find((a) => a.id === id);
    if (!account) return;

    set({ isAccountFormOpen: true, editingAccountId: id, accountFormPurpose: account.purpose ?? 'REGULAR' });
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
    if (!transaction || (transaction.type !== 'income' && transaction.type !== 'expense')) return;

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

function booksFromState(state: FinanceSlice): FinanceBooks {
  return {
    accounts: state.financeAccounts,
    transactions: state.financeTransactions,
    transfers: state.financeTransfers,
    purposeChanges: state.financePurposeChanges,
    goals: state.financeCapitalGoals,
  };
}

function booksToState(books: FinanceBooks) {
  return {
    financeAccounts: books.accounts,
    financeTransactions: books.transactions,
    financeTransfers: books.transfers,
    financePurposeChanges: books.purposeChanges,
    financeCapitalGoals: books.goals,
  };
}

async function commitFinance<T>(
  get: () => AppStore,
  set: (partial: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>)) => void,
  remote: () => Promise<FinanceBooks>,
  local: (books: FinanceBooks) => LedgerResult<T>
) {
  if (await shouldUseFinanceApi()) {
    const books = await remote();
    set((state) => ({
      ...booksToState(rebalance(normalizeBooks(books))),
      selectedAccountId: keepSelection(state.selectedAccountId, books.accounts),
    }));
    return;
  }

  const result = local(booksFromState(get()));
  set((state) => ({
    ...booksToState(result.books),
    selectedAccountId: keepSelection(state.selectedAccountId, result.books.accounts),
  }));
}

function keepSelection(selectedId: string | null, accounts: FinanceAccount[]): string | null {
  if (selectedId && accounts.some((account) => account.id === selectedId && isRegularAccount(account))) {
    return selectedId;
  }
  return getDefaultAccountId(accounts);
}

export function getDefaultAccountId(accounts: FinanceAccount[]): string | null {
  return (
    accounts.find((account) => account.isDefault && isRegularAccount(account))?.id ?? null
  );
}

export function overviewTransactions(
  transactions: FinanceTransaction[],
  accounts: FinanceAccount[]
): FinanceTransaction[] {
  const regularIds = new Set(accounts.filter(isRegularAccount).map((account) => account.id));
  const regular = transactions.filter(
    (transaction) =>
      (transaction.type === 'income' || transaction.type === 'expense') &&
      regularIds.has(transaction.accountId)
  );
  const purchases = transactions
    .filter((transaction) => transaction.type === 'capital_out' && transaction.expenseCategory)
    .map((transaction) => ({
      ...transaction,
      type: 'expense' as const,
      category: transaction.expenseCategory ?? transaction.category,
    }));
  return [...regular, ...purchases];
}

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
