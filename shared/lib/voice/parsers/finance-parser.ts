import type { FinanceCurrency, FinanceCategoryKey, TransactionType } from '@/entities/finance/model/types';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  isExpenseCategory,
  isIncomeCategory,
} from '@/entities/finance/model/categories';
import type { VoiceAccountOption } from '../types';
import { resolveFinanceAccountId } from './resolve-finance-account';

export interface ParsedFinanceVoiceResult {
  type: TransactionType;
  amount: number;
  category: FinanceCategoryKey;
  accountId?: string | null;
  description?: string | null;
  date?: string | null;
}

const EXPENSE_KEYS = EXPENSE_CATEGORIES.map((c) => c.key);
const INCOME_KEYS = INCOME_CATEGORIES.map((c) => c.key);

export const FINANCE_PARSER_SYSTEM_PROMPT = `You extract structured finance transaction data from transcribed speech.

IMPORTANT: Reply with ONLY a raw JSON object. Do not use markdown, code blocks, comments, or any text before or after JSON.

Schema:
{
  "type": "expense" | "income",
  "amount": number,
  "category": string,
  "accountId": string | null,
  "accountName": string | null,
  "currency": "BYN" | "RUB" | "USD" | "CNY" | null,
  "description": string | null,
  "date": string | null
}

Expense categories (type must be "expense"):
${EXPENSE_KEYS.join(', ')}

Income categories (type must be "income"):
${INCOME_KEYS.join(', ')}

Rules:
- "type" is required: "expense" for spending (потратил, расход, купил, оплатил) or "income" for earning (получил, доход, зарплата, начислили).
- "amount" is required and must be a positive number. Parse "50 рублей", "100 dollars", "тридцать" as numbers.
- "category" must match the transaction type. Map natural language to the closest key:
  - продукты, еда, магазин → products
  - подарок (расход) → gifts
  - дом, квартира, аренда, коммуналка → home
  - кафе, ресторан → cafe
  - покупки, одежда → purchases
  - услуги, стрижка → services
  - транспорт, такси, бензин → transport
  - здоровье, аптека, врач → health
  - развлечения, кино → entertainment
  - зарплата → salary
  - пособие → benefit
  - пенсия → pension
  - фриланс → freelance
  - инвестиции, дивиденды → investment
  - If unclear, use other_expense or other_income.
- Match account from Available accounts by name and/or currency (доллары→USD, рубли→RUB if context is Russian account, белорусские→BYN).
- Set accountId from Available accounts when confident; otherwise accountName and currency for resolution.
- "description" — optional note from speech (what was bought, source of income).
- Infer "date" from natural language ("вчера", "today", "31 июля") as YYYY-MM-DD using current datetime context; null if not mentioned.
- Do not invent amount or type not implied by speech.`;

const CATEGORY_ALIASES: Record<string, FinanceCategoryKey> = {
  groceries: 'products',
  grocery: 'products',
  food: 'products',
  продукты: 'products',
  продуктов: 'products',
  gift: 'gifts',
  gifts: 'gifts',
  подарки: 'gifts',
  подарок: 'gifts',
  home: 'home',
  house: 'home',
  дом: 'home',
  cafe: 'cafe',
  restaurant: 'cafe',
  кафе: 'cafe',
  shopping: 'purchases',
  purchases: 'purchases',
  покупки: 'purchases',
  services: 'services',
  услуги: 'services',
  transport: 'transport',
  taxi: 'transport',
  транспорт: 'transport',
  health: 'health',
  здоровье: 'health',
  entertainment: 'entertainment',
  развлечения: 'entertainment',
  salary: 'salary',
  зарплата: 'salary',
  benefit: 'benefit',
  пособие: 'benefit',
  pension: 'pension',
  пенсия: 'pension',
  freelance: 'freelance',
  фриланс: 'freelance',
  investment: 'investment',
  investments: 'investment',
  инвестиции: 'investment',
  other: 'other_expense',
  прочее: 'other_expense',
};

function normalizeTransactionType(value: unknown): TransactionType {
  if (value === 'income') return 'income';
  return 'expense';
}

function normalizeAmount(value: unknown): number {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount is required');
  }
  return amount;
}

function normalizeCategory(value: unknown, type: TransactionType): FinanceCategoryKey {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const aliased = CATEGORY_ALIASES[raw] ?? (raw as FinanceCategoryKey);

  if (type === 'expense' && isExpenseCategory(aliased)) {
    return aliased;
  }

  if (type === 'income' && isIncomeCategory(aliased)) {
    return aliased;
  }

  return type === 'income' ? 'other_income' : 'other_expense';
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function normalizeParsedFinance(
  raw: unknown,
  accounts: VoiceAccountOption[] = []
): ParsedFinanceVoiceResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid finance parse response');
  }

  const data = raw as Record<string, unknown>;
  const type = normalizeTransactionType(data.type);
  const amount = normalizeAmount(data.amount);
  const category = normalizeCategory(data.category, type);

  const accountId = resolveFinanceAccountId(
    typeof data.accountId === 'string' ? data.accountId : null,
    typeof data.accountName === 'string' ? data.accountName : null,
    typeof data.currency === 'string' ? (data.currency as FinanceCurrency) : null,
    accounts
  );

  const description =
    typeof data.description === 'string' && data.description.trim()
      ? data.description.trim()
      : null;

  const date = normalizeDate(data.date);

  return {
    type,
    amount,
    category,
    accountId,
    description,
    date,
  };
}
