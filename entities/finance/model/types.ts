export type TransactionType = 'expense' | 'income';

export type LedgerEntryType =
  | TransactionType
  | 'transfer_in'
  | 'transfer_out'
  | 'capital_in'
  | 'capital_out';

export type FinanceCurrency = 'BYN' | 'RUB' | 'USD' | 'CNY';

export type AccountPurpose = 'REGULAR' | 'CAPITAL';

export type CapitalFlow =
  | 'contribution'
  | 'withdrawal'
  | 'yield'
  | 'revaluation'
  | 'adjustment'
  | 'fee'
  | 'internal';

export type CapitalKind =
  | 'deposit'
  | 'withdrawal'
  | 'interest'
  | 'investment_income'
  | 'revaluation'
  | 'adjustment'
  | 'transfer'
  | 'fee';

export type CapitalDepositSource = 'cash' | 'external' | 'gift' | 'other';

export type TransferLeg = 'debit' | 'credit' | 'fee';

export type CapitalGoalType = 'period_savings' | 'capital_target';

export type CapitalRange = 'month' | '3m' | '6m' | 'year' | 'all';

export type GoalPeriodPreset = 'month' | 'quarter' | 'half' | 'year' | 'five_years' | 'custom';

export type ExpenseCategoryKey =
  | 'products'
  | 'gifts'
  | 'home'
  | 'cafe'
  | 'purchases'
  | 'services'
  | 'transport'
  | 'health'
  | 'entertainment'
  | 'other_expense';

export type IncomeCategoryKey =
  | 'salary'
  | 'benefit'
  | 'pension'
  | 'freelance'
  | 'investment'
  | 'gift_income'
  | 'other_income';

export type FinanceCategoryKey = ExpenseCategoryKey | IncomeCategoryKey;

export interface FinanceAccount {
  id: string;
  name: string;
  currency: FinanceCurrency;
  initialBalance: number;
  balance: number;
  isDefault: boolean;
  purpose: AccountPurpose;
  archivedAt: string | null;
  icon: string | null;
  createdAt?: string;
}

export interface FinanceTransaction {
  id: string;
  accountId: string;
  type: LedgerEntryType;
  amount: number;
  category: FinanceCategoryKey;
  description: string;
  date: string;
  createdAt?: string;
  capitalFlow: CapitalFlow | null;
  capitalKind: CapitalKind | null;
  transferId: string | null;
  transferLeg: TransferLeg | null;
  source: CapitalDepositSource | null;
  expenseCategory: FinanceCategoryKey | null;
  idempotencyKey: string | null;
  counterpartyAccountId: string | null;
}

export interface FinanceTransfer {
  id: string;
  idempotencyKey: string;
  fromAccountId: string;
  toAccountId: string;
  debitAmount: number;
  creditAmount: number;
  exchangeRate: number | null;
  feeAmount: number;
  date: string;
  comment: string;
  createdAt?: string;
}

export interface FinanceAccountPurposeChange {
  id: string;
  accountId: string;
  fromPurpose: AccountPurpose | null;
  toPurpose: AccountPurpose;
  balanceAtChange: number;
  effectiveDate: string;
  createdAt?: string;
}

export interface FinanceCapitalGoal {
  id: string;
  name: string;
  goalType: CapitalGoalType;
  targetAmount: number;
  currency: FinanceCurrency;
  startDate: string;
  endDate: string;
  description: string;
  archivedAt: string | null;
  celebratedAt: string | null;
  createdAt?: string;
}

export interface FinanceBooks {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  transfers: FinanceTransfer[];
  purposeChanges: FinanceAccountPurposeChange[];
  goals: FinanceCapitalGoal[];
}

export interface FinanceAccountInput {
  name: string;
  currency: FinanceCurrency;
  initialBalance?: number;
  purpose?: AccountPurpose;
  icon?: string | null;
  purposeDate?: string;
}

export interface FinanceTransactionInput {
  accountId: string;
  type: TransactionType;
  amount: number;
  category: FinanceCategoryKey;
  description?: string;
  date: string;
}

export interface CategoryBreakdownItem {
  category: FinanceCategoryKey;
  amount: number;
  percentage: number;
}

export type FinancePeriod = 'day' | 'week' | 'month' | 'year';
