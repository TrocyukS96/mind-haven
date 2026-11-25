import { Prisma, type PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
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
import { prisma } from '@/shared/lib/db';
import { rebalance, type LedgerResult } from './capital-ledger';
import { money } from './decimal';
import { diffFinanceBooks, type BooksDiff } from './finance-books';
import { FinanceRuleError, isFinanceRuleError } from './finance-error';

type Db = Prisma.TransactionClient | PrismaClient;

function asNumber(value: Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function asDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function asIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function asDecimal(value: number): Decimal {
  return new Decimal(money(value));
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function loadFinanceBooks(db: Db, userId: string): Promise<FinanceBooks> {
  const [accounts, transactions, transfers, purposeChanges, goals] = await Promise.all([
    db.financeAccount.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    db.financeTransaction.findMany({
      where: { userId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    db.financeTransfer.findMany({
      where: { userId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    db.financeAccountPurposeChange.findMany({
      where: { userId },
      orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
    }),
    db.financeCapitalGoal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
  ]);

  return {
    accounts: accounts.map((row) => ({
      id: row.id,
      name: row.name,
      currency: row.currency as FinanceCurrency,
      initialBalance: asNumber(row.initialBalance),
      balance: 0,
      isDefault: row.isDefault,
      purpose: row.purpose,
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
      icon: row.icon,
      createdAt: row.createdAt.toISOString(),
    })),
    transactions: transactions.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      type: row.type as LedgerEntryType,
      amount: asNumber(row.amount),
      category: row.category as FinanceCategoryKey,
      description: row.description,
      date: asIsoDate(row.date),
      createdAt: row.createdAt.toISOString(),
      capitalFlow: (row.capitalFlow as CapitalFlow | null) ?? null,
      capitalKind: (row.capitalKind as CapitalKind | null) ?? null,
      transferId: row.transferId,
      transferLeg: (row.transferLeg as TransferLeg | null) ?? null,
      source: (row.source as CapitalDepositSource | null) ?? null,
      expenseCategory: (row.expenseCategory as FinanceCategoryKey | null) ?? null,
      idempotencyKey: row.idempotencyKey,
      counterpartyAccountId: row.counterpartyAccountId,
    })),
    transfers: transfers.map((row) => ({
      id: row.id,
      idempotencyKey: row.idempotencyKey,
      fromAccountId: row.fromAccountId,
      toAccountId: row.toAccountId,
      debitAmount: asNumber(row.debitAmount),
      creditAmount: asNumber(row.creditAmount),
      exchangeRate: row.exchangeRate == null ? null : asNumber(row.exchangeRate),
      feeAmount: asNumber(row.feeAmount),
      date: asIsoDate(row.date),
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
    })),
    purposeChanges: purposeChanges.map(
      (row): FinanceAccountPurposeChange => ({
        id: row.id,
        accountId: row.accountId,
        fromPurpose: row.fromPurpose,
        toPurpose: row.toPurpose,
        balanceAtChange: asNumber(row.balanceAtChange),
        effectiveDate: asIsoDate(row.effectiveDate),
        createdAt: row.createdAt.toISOString(),
      })
    ),
    goals: goals.map(
      (row): FinanceCapitalGoal => ({
        id: row.id,
        name: row.name,
        goalType: row.goalType as FinanceCapitalGoal['goalType'],
        targetAmount: asNumber(row.targetAmount),
        currency: row.currency as FinanceCurrency,
        startDate: asIsoDate(row.startDate),
        endDate: asIsoDate(row.endDate),
        description: row.description,
        archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
        celebratedAt: row.celebratedAt ? row.celebratedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
      })
    ),
  };
}

async function persistDiff(db: Db, userId: string, diff: BooksDiff): Promise<void> {
  if (diff.transactionIdsDelete.length > 0) {
    await db.financeTransaction.deleteMany({
      where: { userId, id: { in: diff.transactionIdsDelete } },
    });
  }
  if (diff.transferIdsDelete.length > 0) {
    await db.financeTransfer.deleteMany({
      where: { userId, id: { in: diff.transferIdsDelete } },
    });
  }
  if (diff.purposeChangeIdsDelete.length > 0) {
    await db.financeAccountPurposeChange.deleteMany({
      where: { userId, id: { in: diff.purposeChangeIdsDelete } },
    });
  }
  if (diff.goalIdsDelete.length > 0) {
    await db.financeCapitalGoal.deleteMany({
      where: { userId, id: { in: diff.goalIdsDelete } },
    });
  }
  if (diff.accountIdsDelete.length > 0) {
    await db.financeAccount.deleteMany({
      where: { userId, id: { in: diff.accountIdsDelete } },
    });
  }

  for (const account of diff.accountsUpsert) {
    const data = {
      name: account.name,
      currency: account.currency,
      initialBalance: asDecimal(account.initialBalance),
      isDefault: account.isDefault,
      purpose: account.purpose as AccountPurpose,
      icon: account.icon,
      archivedAt: account.archivedAt ? new Date(account.archivedAt) : null,
    };
    await db.financeAccount.upsert({
      where: { id: account.id },
      create: {
        id: account.id,
        userId,
        ...data,
        createdAt: account.createdAt ? new Date(account.createdAt) : undefined,
      },
      update: data,
    });
  }

  for (const transfer of diff.transfersUpsert) {
    const data = {
      idempotencyKey: transfer.idempotencyKey,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      debitAmount: asDecimal(transfer.debitAmount),
      creditAmount: asDecimal(transfer.creditAmount),
      exchangeRate:
        transfer.exchangeRate == null ? null : new Decimal(transfer.exchangeRate.toFixed(8)),
      feeAmount: asDecimal(transfer.feeAmount),
      date: asDate(transfer.date),
      comment: transfer.comment,
    };
    await db.financeTransfer.upsert({
      where: { id: transfer.id },
      create: {
        id: transfer.id,
        userId,
        ...data,
        createdAt: transfer.createdAt ? new Date(transfer.createdAt) : undefined,
      },
      update: data,
    });
  }

  for (const transaction of diff.transactionsUpsert) {
    const data = {
      accountId: transaction.accountId,
      type: transaction.type,
      amount: asDecimal(transaction.amount),
      category: transaction.category,
      description: transaction.description,
      date: asDate(transaction.date),
      capitalFlow: transaction.capitalFlow,
      capitalKind: transaction.capitalKind,
      transferId: transaction.transferId,
      transferLeg: transaction.transferLeg,
      source: transaction.source,
      expenseCategory: transaction.expenseCategory,
      idempotencyKey: transaction.idempotencyKey,
      counterpartyAccountId: transaction.counterpartyAccountId,
    };
    await db.financeTransaction.upsert({
      where: { id: transaction.id },
      create: {
        id: transaction.id,
        userId,
        ...data,
        createdAt: transaction.createdAt ? new Date(transaction.createdAt) : undefined,
      },
      update: data,
    });
  }

  for (const change of diff.purposeChangesUpsert) {
    const data = {
      accountId: change.accountId,
      fromPurpose: change.fromPurpose,
      toPurpose: change.toPurpose,
      balanceAtChange: asDecimal(change.balanceAtChange),
      effectiveDate: asDate(change.effectiveDate),
    };
    await db.financeAccountPurposeChange.upsert({
      where: { id: change.id },
      create: {
        id: change.id,
        userId,
        ...data,
        createdAt: change.createdAt ? new Date(change.createdAt) : undefined,
      },
      update: data,
    });
  }

  for (const goal of diff.goalsUpsert) {
    const data = {
      name: goal.name,
      goalType: goal.goalType,
      targetAmount: asDecimal(goal.targetAmount),
      currency: goal.currency,
      startDate: asDate(goal.startDate),
      endDate: asDate(goal.endDate),
      description: goal.description,
      archivedAt: goal.archivedAt ? new Date(goal.archivedAt) : null,
      celebratedAt: goal.celebratedAt ? new Date(goal.celebratedAt) : null,
    };
    await db.financeCapitalGoal.upsert({
      where: { id: goal.id },
      create: {
        id: goal.id,
        userId,
        ...data,
        createdAt: goal.createdAt ? new Date(goal.createdAt) : undefined,
      },
      update: data,
    });
  }
}

export async function runFinanceCommand<T>(
  userId: string,
  command: (books: FinanceBooks) => LedgerResult<T>
): Promise<LedgerResult<T>> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const before = rebalance(await loadFinanceBooks(tx, userId));
        const result = command(before);
        if (!result.duplicate) {
          await persistDiff(tx, userId, diffFinanceBooks(before, result.books));
        }
        return {
          ...result,
          books: rebalance(await loadFinanceBooks(tx, userId)),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 }
    );
  } catch (error) {
    if (isFinanceRuleError(error)) throw error;
    if (isUniqueViolation(error)) {
      const books = rebalance(await loadFinanceBooks(prisma, userId));
      const replay = command(books);
      return { ...replay, books: replay.duplicate ? books : replay.books };
    }
    throw error;
  }
}

export async function getFinanceBooks(userId: string): Promise<FinanceBooks> {
  return rebalance(await loadFinanceBooks(prisma, userId));
}

export function financeErrorStatus(error: unknown): { status: number; error: string } {
  if (isFinanceRuleError(error)) {
    const code = error.code;
    const missing = new Set([
      'ACCOUNT_NOT_FOUND',
      'TRANSFER_NOT_FOUND',
      'TRANSACTION_NOT_FOUND',
      'GOAL_NOT_FOUND',
    ]);
    return { status: missing.has(code) ? 404 : 400, error: code };
  }
  return {
    status: 400,
    error: error instanceof Error ? error.message : 'Request failed',
  };
}
