import type {
  AccountPurpose,
  CapitalDepositSource,
  CapitalFlow,
  CapitalKind,
  FinanceAccount,
  FinanceAccountPurposeChange,
  FinanceBooks,
  FinanceCapitalGoal,
  FinanceCategoryKey,
  FinanceCurrency,
  FinanceTransaction,
  FinanceTransfer,
  LedgerEntryType,
  TransferLeg,
} from '@/entities/finance/model/types';
import { blankLedgerFields } from './capital-ledger';

const PURPOSES = new Set<AccountPurpose>(['REGULAR', 'CAPITAL']);
const CURRENCIES = new Set<FinanceCurrency>(['BYN', 'RUB', 'USD', 'CNY']);

export interface BooksDiff {
  accountsUpsert: FinanceAccount[];
  accountIdsDelete: string[];
  transactionsUpsert: FinanceTransaction[];
  transactionIdsDelete: string[];
  transfersUpsert: FinanceTransfer[];
  transferIdsDelete: string[];
  purposeChangesUpsert: FinanceAccountPurposeChange[];
  purposeChangeIdsDelete: string[];
  goalsUpsert: FinanceCapitalGoal[];
  goalIdsDelete: string[];
}

export function emptyBooksDiff(): BooksDiff {
  return {
    accountsUpsert: [],
    accountIdsDelete: [],
    transactionsUpsert: [],
    transactionIdsDelete: [],
    transfersUpsert: [],
    transferIdsDelete: [],
    purposeChangesUpsert: [],
    purposeChangeIdsDelete: [],
    goalsUpsert: [],
    goalIdsDelete: [],
  };
}

function diffById<T extends { id: string }>(
  before: T[],
  after: T[],
  signature: (item: T) => string
): { upsert: T[]; deleteIds: string[] } {
  const afterIds = new Set(after.map((item) => item.id));
  const beforeMap = new Map(before.map((item) => [item.id, item]));
  return {
    deleteIds: before.filter((item) => !afterIds.has(item.id)).map((item) => item.id),
    upsert: after.filter((item) => {
      const previous = beforeMap.get(item.id);
      return !previous || signature(previous) !== signature(item);
    }),
  };
}

function accountSignature(account: FinanceAccount): string {
  return JSON.stringify({
    name: account.name,
    currency: account.currency,
    initialBalance: account.initialBalance,
    isDefault: account.isDefault,
    purpose: account.purpose,
    archivedAt: account.archivedAt,
    icon: account.icon,
  });
}

export function diffFinanceBooks(before: FinanceBooks, after: FinanceBooks): BooksDiff {
  const accounts = diffById(before.accounts, after.accounts, accountSignature);
  const transactions = diffById(before.transactions, after.transactions, (item) =>
    JSON.stringify(item)
  );
  const transfers = diffById(before.transfers, after.transfers, (item) => JSON.stringify(item));
  const purposeChanges = diffById(before.purposeChanges, after.purposeChanges, (item) =>
    JSON.stringify(item)
  );
  const goals = diffById(before.goals, after.goals, (item) => JSON.stringify(item));

  return {
    accountsUpsert: accounts.upsert,
    accountIdsDelete: accounts.deleteIds,
    transactionsUpsert: transactions.upsert,
    transactionIdsDelete: transactions.deleteIds,
    transfersUpsert: transfers.upsert,
    transferIdsDelete: transfers.deleteIds,
    purposeChangesUpsert: purposeChanges.upsert,
    purposeChangeIdsDelete: purposeChanges.deleteIds,
    goalsUpsert: goals.upsert,
    goalIdsDelete: goals.deleteIds,
  };
}

function asPurpose(value: unknown): AccountPurpose {
  return typeof value === 'string' && PURPOSES.has(value as AccountPurpose)
    ? (value as AccountPurpose)
    : 'REGULAR';
}

function asCurrency(value: unknown): FinanceCurrency {
  return typeof value === 'string' && CURRENCIES.has(value as FinanceCurrency)
    ? (value as FinanceCurrency)
    : 'BYN';
}

export function normalizeAccount(raw: Partial<FinanceAccount> & { id?: string }): FinanceAccount {
  return {
    id: raw.id ?? '',
    name: raw.name ?? '',
    currency: asCurrency(raw.currency),
    initialBalance: typeof raw.initialBalance === 'number' ? raw.initialBalance : 0,
    balance: typeof raw.balance === 'number' ? raw.balance : 0,
    isDefault: Boolean(raw.isDefault),
    purpose: asPurpose(raw.purpose),
    archivedAt: raw.archivedAt ?? null,
    icon: raw.icon ?? null,
    createdAt: raw.createdAt,
  };
}

export function normalizeTransaction(
  raw: Partial<FinanceTransaction> & { id?: string }
): FinanceTransaction {
  const type = (raw.type ?? 'expense') as LedgerEntryType;
  return {
    id: raw.id ?? '',
    accountId: raw.accountId ?? '',
    type,
    amount: typeof raw.amount === 'number' ? raw.amount : 0,
    category: (raw.category ?? 'other_expense') as FinanceCategoryKey,
    description: raw.description ?? '',
    date: raw.date ?? '',
    createdAt: raw.createdAt,
    capitalFlow: (raw.capitalFlow ?? null) as CapitalFlow | null,
    capitalKind: (raw.capitalKind ?? null) as CapitalKind | null,
    transferId: raw.transferId ?? null,
    transferLeg: (raw.transferLeg ?? null) as TransferLeg | null,
    source: (raw.source ?? null) as CapitalDepositSource | null,
    expenseCategory: (raw.expenseCategory ?? null) as FinanceCategoryKey | null,
    idempotencyKey: raw.idempotencyKey ?? null,
    counterpartyAccountId: raw.counterpartyAccountId ?? null,
  };
}

export function normalizeBooks(raw: Partial<FinanceBooks> | null | undefined): FinanceBooks {
  return {
    accounts: (raw?.accounts ?? []).map((account) => normalizeAccount(account)),
    transactions: (raw?.transactions ?? []).map((transaction) => normalizeTransaction(transaction)),
    transfers: raw?.transfers ?? [],
    purposeChanges: raw?.purposeChanges ?? [],
    goals: raw?.goals ?? [],
  };
}

export interface PersistedFinanceState {
  financeAccounts: FinanceAccount[];
  financeTransactions: FinanceTransaction[];
  financeTransfers: FinanceTransfer[];
  financePurposeChanges: FinanceAccountPurposeChange[];
  financeCapitalGoals: FinanceCapitalGoal[];
}

export function normalizePersistedFinanceState(
  state: Record<string, unknown>
): Record<string, unknown> & PersistedFinanceState {
  const accounts = Array.isArray(state.financeAccounts)
    ? state.financeAccounts.map((account) =>
        normalizeAccount(account as Partial<FinanceAccount> & { id?: string })
      )
    : [];
  const transactions = Array.isArray(state.financeTransactions)
    ? state.financeTransactions.map((transaction) =>
        normalizeTransaction({
          ...blankLedgerFields(),
          ...(transaction as Partial<FinanceTransaction>),
        })
      )
    : [];

  return {
    ...state,
    financeAccounts: accounts,
    financeTransactions: transactions,
    financeTransfers: Array.isArray(state.financeTransfers)
      ? (state.financeTransfers as FinanceTransfer[])
      : [],
    financePurposeChanges: Array.isArray(state.financePurposeChanges)
      ? (state.financePurposeChanges as FinanceAccountPurposeChange[])
      : [],
    financeCapitalGoals: Array.isArray(state.financeCapitalGoals)
      ? (state.financeCapitalGoals as FinanceCapitalGoal[])
      : [],
  };
}
