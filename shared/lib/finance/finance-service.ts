import type { FinanceCurrency } from '@/entities/finance/model/types';
import { FINANCE_CURRENCIES } from '@/entities/finance/model/categories';
import type {
  FinanceAccount,
  FinanceAccountInput,
  FinanceTransaction,
  FinanceTransactionInput,
  TransactionType,
} from '@/entities/finance/model/types';
import { prisma } from '@/shared/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

function decimalToNumber(value: Decimal | number): number {
  return typeof value === 'number' ? value : Number(value.toString());
}

function parseDateString(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Invalid date format');
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function computeBalance(
  initialBalance: number,
  transactions: { type: string; amount: number }[]
): number {
  return transactions.reduce((balance, tx) => {
    if (tx.type === 'income') return balance + tx.amount;
    return balance - tx.amount;
  }, initialBalance);
}

export interface FinanceAccountDbRow {
  id: string;
  userId: string;
  name: string;
  currency: string;
  initialBalance: Decimal;
  createdAt: Date;
  updatedAt: Date;
  transactions?: { type: string; amount: Decimal }[];
}

export interface FinanceTransactionDbRow {
  id: string;
  userId: string;
  accountId: string;
  type: string;
  amount: Decimal;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function mapAccountFromDb(row: FinanceAccountDbRow): FinanceAccount {
  const initialBalance = decimalToNumber(row.initialBalance);
  const txs = (row.transactions ?? []).map((t) => ({
    type: t.type,
    amount: decimalToNumber(t.amount),
  }));

  return {
    id: row.id,
    name: row.name,
    currency: row.currency as FinanceAccount['currency'],
    initialBalance,
    balance: computeBalance(initialBalance, txs),
  };
}

export function mapTransactionFromDb(row: FinanceTransactionDbRow): FinanceTransaction {
  return {
    id: row.id,
    accountId: row.accountId,
    type: row.type as TransactionType,
    amount: decimalToNumber(row.amount),
    category: row.category as FinanceTransaction['category'],
    description: row.description,
    date: row.date.toISOString().slice(0, 10),
  };
}

function normalizeAccountInput(input: FinanceAccountInput): FinanceAccountInput {
  const name = input.name.trim();
  if (!name) throw new Error('Account name is required');

  const currency = input.currency?.trim() as FinanceCurrency;
  if (!currency || !FINANCE_CURRENCIES.includes(currency)) {
    throw new Error('Currency is required');
  }

  const initialBalance = input.initialBalance ?? 0;
  if (initialBalance < 0) throw new Error('Initial balance cannot be negative');

  return { name, currency, initialBalance };
}

function normalizeTransactionInput(input: FinanceTransactionInput): FinanceTransactionInput {
  const accountId = input.accountId?.trim();
  if (!accountId) throw new Error('Account is required');

  const type = input.type;
  if (type !== 'expense' && type !== 'income') {
    throw new Error('Invalid transaction type');
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const category = input.category?.trim();
  if (!category) throw new Error('Category is required');

  const date = input.date?.trim();
  if (!date) throw new Error('Date is required');
  parseDateString(date);

  return {
    accountId,
    type,
    amount,
    category: category as FinanceTransactionInput['category'],
    description: input.description?.trim() ?? '',
    date,
  };
}

export async function getFinanceAccounts(userId: string): Promise<FinanceAccount[]> {
  const rows = await prisma.financeAccount.findMany({
    where: { userId },
    include: { transactions: { select: { type: true, amount: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map(mapAccountFromDb);
}

export async function getFinanceTransactions(userId: string): Promise<FinanceTransaction[]> {
  const rows = await prisma.financeTransaction.findMany({
    where: { userId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

  return rows.map(mapTransactionFromDb);
}

export async function createFinanceAccount(
  userId: string,
  input: FinanceAccountInput
): Promise<FinanceAccount> {
  const data = normalizeAccountInput(input);

  const row = await prisma.financeAccount.create({
    data: {
      userId,
      name: data.name,
      currency: data.currency,
      initialBalance: data.initialBalance ?? 0,
    },
    include: { transactions: { select: { type: true, amount: true } } },
  });

  return mapAccountFromDb(row);
}

export async function updateFinanceAccount(
  userId: string,
  accountId: string,
  input: FinanceAccountInput
): Promise<FinanceAccount> {
  const data = normalizeAccountInput(input);

  const existing = await prisma.financeAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });

  if (!existing) throw new Error('Account not found');

  const row = await prisma.financeAccount.update({
    where: { id: accountId },
    data: {
      name: data.name,
      currency: data.currency,
      initialBalance: data.initialBalance ?? 0,
    },
    include: { transactions: { select: { type: true, amount: true } } },
  });

  return mapAccountFromDb(row);
}

export async function deleteFinanceAccount(userId: string, accountId: string): Promise<void> {
  const existing = await prisma.financeAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });

  if (!existing) throw new Error('Account not found');

  await prisma.financeAccount.delete({ where: { id: accountId } });
}

export async function createFinanceTransaction(
  userId: string,
  input: FinanceTransactionInput
): Promise<FinanceTransaction> {
  const data = normalizeTransactionInput(input);

  const account = await prisma.financeAccount.findFirst({
    where: { id: data.accountId, userId },
    select: { id: true },
  });

  if (!account) throw new Error('Account not found');

  const row = await prisma.financeTransaction.create({
    data: {
      userId,
      accountId: data.accountId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      description: data.description ?? '',
      date: parseDateString(data.date),
    },
  });

  return mapTransactionFromDb(row);
}

export async function deleteFinanceTransaction(
  userId: string,
  transactionId: string
): Promise<void> {
  const existing = await prisma.financeTransaction.findFirst({
    where: { id: transactionId, userId },
    select: { id: true },
  });

  if (!existing) throw new Error('Transaction not found');

  await prisma.financeTransaction.delete({ where: { id: transactionId } });
}

export async function updateFinanceTransaction(
  userId: string,
  transactionId: string,
  input: FinanceTransactionInput
): Promise<FinanceTransaction> {
  const data = normalizeTransactionInput(input);

  const existing = await prisma.financeTransaction.findFirst({
    where: { id: transactionId, userId },
    select: { id: true },
  });

  if (!existing) throw new Error('Transaction not found');

  const account = await prisma.financeAccount.findFirst({
    where: { id: data.accountId, userId },
    select: { id: true },
  });

  if (!account) throw new Error('Account not found');

  const row = await prisma.financeTransaction.update({
    where: { id: transactionId },
    data: {
      accountId: data.accountId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      description: data.description ?? '',
      date: parseDateString(data.date),
    },
  });

  return mapTransactionFromDb(row);
}

export async function getFinanceData(userId: string): Promise<{
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
}> {
  const [accounts, transactions] = await Promise.all([
    getFinanceAccounts(userId),
    getFinanceTransactions(userId),
  ]);

  return { accounts, transactions };
}
