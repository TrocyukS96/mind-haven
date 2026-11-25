import type {
  FinanceAccount,
  FinanceAccountInput,
  FinanceBooks,
  FinanceTransaction,
  FinanceTransactionInput,
} from '@/entities/finance/model/types';
import type { CapitalMovementInput, GoalInput, TransferInput } from '@/shared/lib/finance/capital-ledger';
import type { AccountPurpose } from '@/entities/finance/model/types';
import type { HistoricalRateSeries } from '@/shared/lib/finance/historical-rates';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    const error = new Error(payload.error ?? 'Request failed');
    throw error;
  }

  return payload;
}

export async function fetchFinanceBooks(): Promise<FinanceBooks> {
  const response = await fetch('/api/finance/books');
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function fetchFinanceAccounts(): Promise<FinanceAccount[]> {
  const response = await fetch('/api/finance/accounts');
  const payload = await parseResponse<{ accounts: FinanceAccount[] }>(response);
  return payload.accounts;
}

export async function createFinanceAccountRequest(input: FinanceAccountInput): Promise<FinanceBooks> {
  const response = await fetch('/api/finance/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function deleteFinanceAccountRequest(id: string): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/accounts/${id}`, { method: 'DELETE' });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function setDefaultFinanceAccountRequest(accountId: string | null): Promise<FinanceBooks> {
  const response = await fetch('/api/finance/default-account', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function updateFinanceAccountRequest(
  id: string,
  input: FinanceAccountInput
): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function archiveFinanceAccountRequest(id: string): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/accounts/${id}/archive`, { method: 'POST' });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function setFinanceAccountPurposeRequest(
  id: string,
  purpose: AccountPurpose,
  date: string
): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/accounts/${id}/purpose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose, date }),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function fetchFinanceTransactions(): Promise<FinanceTransaction[]> {
  const response = await fetch('/api/finance/transactions');
  const payload = await parseResponse<{ transactions: FinanceTransaction[] }>(response);
  return payload.transactions;
}

export async function createFinanceTransactionRequest(
  input: FinanceTransactionInput
): Promise<FinanceBooks> {
  const response = await fetch('/api/finance/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function deleteFinanceTransactionRequest(id: string): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function updateFinanceTransactionRequest(
  id: string,
  input: FinanceTransactionInput
): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function createFinanceTransferRequest(input: TransferInput): Promise<FinanceBooks> {
  const response = await fetch('/api/finance/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function updateFinanceTransferRequest(
  id: string,
  input: TransferInput
): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/transfers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function deleteFinanceTransferRequest(id: string): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/transfers/${id}`, { method: 'DELETE' });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function createCapitalMovementRequest(input: CapitalMovementInput): Promise<FinanceBooks> {
  const response = await fetch('/api/finance/capital/movements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function updateCapitalMovementRequest(
  id: string,
  input: CapitalMovementInput
): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/capital/movements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function createFinanceGoalRequest(input: GoalInput): Promise<FinanceBooks> {
  const response = await fetch('/api/finance/capital/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function updateFinanceGoalRequest(id: string, input: GoalInput): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/capital/goals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function archiveFinanceGoalRequest(id: string): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/capital/goals/${id}/archive`, {
    method: 'POST',
  });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function deleteFinanceGoalRequest(id: string): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/capital/goals/${id}`, { method: 'DELETE' });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function celebrateFinanceGoalRequest(id: string): Promise<FinanceBooks> {
  const response = await fetch(`/api/finance/capital/goals/${id}/celebrate`, { method: 'POST' });
  const payload = await parseResponse<{ books: FinanceBooks }>(response);
  return payload.books;
}

export async function fetchHistoricalRates(from: string, to: string): Promise<HistoricalRateSeries> {
  const response = await fetch(
    `/api/finance/exchange-rates/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  const payload = await parseResponse<{ series: HistoricalRateSeries }>(response);
  return payload.series;
}
