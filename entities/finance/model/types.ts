export type TransactionType = 'expense' | 'income';

export type FinanceCurrency = 'BYN' | 'RUB' | 'USD' | 'CNY';

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
}

export interface FinanceTransaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  category: FinanceCategoryKey;
  description: string;
  date: string;
}

export interface FinanceAccountInput {
  name: string;
  currency: FinanceCurrency;
  initialBalance?: number;
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
