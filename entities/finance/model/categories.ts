import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  Car,
  Film,
  Gift,
  HandCoins,
  Heart,
  Home,
  Landmark,
  Laptop,
  MoreHorizontal,
  Scissors,
  ShoppingBasket,
  Shirt,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';
import type {
  ExpenseCategoryKey,
  FinanceCategoryKey,
  IncomeCategoryKey,
  TransactionType,
} from './types';

export interface FinanceCategoryDefinition {
  key: FinanceCategoryKey;
  type: TransactionType;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const EXPENSE_CATEGORIES: FinanceCategoryDefinition[] = [
  { key: 'products', type: 'expense', icon: ShoppingBasket, color: '#22c55e', bgColor: 'bg-green-500/15' },
  { key: 'gifts', type: 'expense', icon: Gift, color: '#ec4899', bgColor: 'bg-pink-500/15' },
  { key: 'home', type: 'expense', icon: Home, color: '#f97316', bgColor: 'bg-orange-500/15' },
  { key: 'cafe', type: 'expense', icon: UtensilsCrossed, color: '#a855f7', bgColor: 'bg-purple-500/15' },
  { key: 'purchases', type: 'expense', icon: Shirt, color: '#d4a574', bgColor: 'bg-amber-700/15' },
  { key: 'services', type: 'expense', icon: Scissors, color: '#eab308', bgColor: 'bg-yellow-500/15' },
  { key: 'transport', type: 'expense', icon: Car, color: '#3b82f6', bgColor: 'bg-blue-500/15' },
  { key: 'health', type: 'expense', icon: Heart, color: '#ef4444', bgColor: 'bg-red-500/15' },
  { key: 'entertainment', type: 'expense', icon: Film, color: '#6366f1', bgColor: 'bg-indigo-500/15' },
  { key: 'other_expense', type: 'expense', icon: MoreHorizontal, color: '#94a3b8', bgColor: 'bg-slate-500/15' },
];

export const INCOME_CATEGORIES: FinanceCategoryDefinition[] = [
  { key: 'salary', type: 'income', icon: Banknote, color: '#22c55e', bgColor: 'bg-green-500/15' },
  { key: 'benefit', type: 'income', icon: HandCoins, color: '#3b82f6', bgColor: 'bg-blue-500/15' },
  { key: 'pension', type: 'income', icon: Landmark, color: '#f97316', bgColor: 'bg-orange-500/15' },
  { key: 'freelance', type: 'income', icon: Laptop, color: '#a855f7', bgColor: 'bg-purple-500/15' },
  { key: 'investment', type: 'income', icon: TrendingUp, color: '#14b8a6', bgColor: 'bg-teal-500/15' },
  { key: 'gift_income', type: 'income', icon: Gift, color: '#ec4899', bgColor: 'bg-pink-500/15' },
  { key: 'other_income', type: 'income', icon: MoreHorizontal, color: '#94a3b8', bgColor: 'bg-slate-500/15' },
];

const CATEGORY_MAP = new Map<FinanceCategoryKey, FinanceCategoryDefinition>(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.key, c])
);

export function getCategoryDefinition(key: FinanceCategoryKey): FinanceCategoryDefinition {
  return CATEGORY_MAP.get(key) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

export function getCategoriesByType(type: TransactionType): FinanceCategoryDefinition[] {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

export function isExpenseCategory(key: string): key is ExpenseCategoryKey {
  return EXPENSE_CATEGORIES.some((c) => c.key === key);
}

export function isIncomeCategory(key: string): key is IncomeCategoryKey {
  return INCOME_CATEGORIES.some((c) => c.key === key);
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  BYN: 'Br',
  RUB: '₽',
  USD: '$',
  CNY: '¥',
};

export const FINANCE_CURRENCIES = ['BYN', 'RUB', 'USD', 'CNY'] as const;
