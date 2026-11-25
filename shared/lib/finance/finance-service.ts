import type {
  FinanceAccount,
  FinanceAccountInput,
  FinanceBooks,
  FinanceTransaction,
  FinanceTransactionInput,
} from '@/entities/finance/model/types';
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
  setAccountPurpose,
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
} from './capital-ledger';
import { getFinanceBooks, runFinanceCommand } from './finance-books-store';

export { getFinanceBooks };

async function run<T>(
  userId: string,
  command: (books: FinanceBooks) => LedgerResult<T>
): Promise<LedgerResult<T>> {
  return runFinanceCommand(userId, command);
}

export async function getFinanceAccounts(userId: string): Promise<FinanceAccount[]> {
  const books = await getFinanceBooks(userId);
  return books.accounts;
}

export async function getFinanceTransactions(userId: string): Promise<FinanceTransaction[]> {
  const books = await getFinanceBooks(userId);
  return books.transactions;
}

export async function getFinanceData(userId: string): Promise<FinanceBooks> {
  return getFinanceBooks(userId);
}

export async function createFinanceAccount(userId: string, input: FinanceAccountInput) {
  return run(userId, (books) => createAccount(books, input));
}

export async function updateFinanceAccount(
  userId: string,
  accountId: string,
  input: FinanceAccountInput
) {
  return run(userId, (books) => updateAccount(books, accountId, input));
}

export async function setDefaultFinanceAccount(userId: string, accountId: string | null) {
  return run(userId, (books) => setDefaultAccount(books, accountId));
}

export async function deleteFinanceAccount(userId: string, accountId: string) {
  return run(userId, (books) => deleteAccount(books, accountId));
}

export async function archiveFinanceAccount(userId: string, accountId: string) {
  return run(userId, (books) => archiveAccount(books, accountId));
}

export async function setFinanceAccountPurpose(
  userId: string,
  accountId: string,
  purpose: FinanceAccount['purpose'],
  date: string
) {
  return run(userId, (books) => setAccountPurpose(books, accountId, purpose, date));
}

export async function createFinanceTransaction(userId: string, input: FinanceTransactionInput) {
  return run(userId, (books) => createRegularTransaction(books, input));
}

export async function updateFinanceTransaction(
  userId: string,
  transactionId: string,
  input: FinanceTransactionInput
) {
  return run(userId, (books) => updateRegularTransaction(books, transactionId, input));
}

export async function deleteFinanceTransaction(userId: string, transactionId: string) {
  return run(userId, (books) => deleteTransaction(books, transactionId));
}

export async function createFinanceTransfer(userId: string, input: TransferInput) {
  return run(userId, (books) => createTransfer(books, input));
}

export async function updateFinanceTransfer(
  userId: string,
  transferId: string,
  input: TransferInput
) {
  return run(userId, (books) => updateTransfer(books, transferId, input));
}

export async function deleteFinanceTransfer(userId: string, transferId: string) {
  return run(userId, (books) => deleteTransfer(books, transferId));
}

export async function createCapitalMovementRecord(userId: string, input: CapitalMovementInput) {
  return run(userId, (books) => createCapitalMovement(books, input));
}

export async function updateCapitalMovementRecord(
  userId: string,
  transactionId: string,
  input: CapitalMovementInput
) {
  return run(userId, (books) => updateCapitalMovement(books, transactionId, input));
}

export async function createFinanceGoal(userId: string, input: GoalInput) {
  return run(userId, (books) => createGoal(books, input));
}

export async function updateFinanceGoal(userId: string, goalId: string, input: GoalInput) {
  return run(userId, (books) => updateGoal(books, goalId, input));
}

export async function archiveFinanceGoal(userId: string, goalId: string) {
  return run(userId, (books) => archiveGoal(books, goalId));
}

export async function deleteFinanceGoal(userId: string, goalId: string) {
  return run(userId, (books) => deleteGoal(books, goalId));
}

export async function celebrateFinanceGoal(userId: string, goalId: string) {
  return run(userId, (books) => celebrateGoal(books, goalId));
}
