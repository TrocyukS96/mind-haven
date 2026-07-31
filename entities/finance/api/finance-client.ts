import type {
  FinanceAccount,
  FinanceAccountInput,
  FinanceTransaction,
  FinanceTransactionInput,
} from '@/entities/finance/model/types';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }

  return payload;
}

export async function fetchFinanceAccounts(): Promise<FinanceAccount[]> {
  const response = await fetch('/api/finance/accounts');
  const payload = await parseResponse<{ accounts: FinanceAccount[] }>(response);
  return payload.accounts;
}

export async function createFinanceAccountRequest(
  input: FinanceAccountInput
): Promise<FinanceAccount> {
  const response = await fetch('/api/finance/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ account: FinanceAccount }>(response);
  return payload.account;
}

export async function deleteFinanceAccountRequest(id: string): Promise<void> {
  const response = await fetch(`/api/finance/accounts/${id}`, {
    method: 'DELETE',
  });
  await parseResponse<{ ok: true }>(response);
}

export async function fetchFinanceTransactions(): Promise<FinanceTransaction[]> {
  const response = await fetch('/api/finance/transactions');
  const payload = await parseResponse<{ transactions: FinanceTransaction[] }>(response);
  return payload.transactions;
}

export async function createFinanceTransactionRequest(
  input: FinanceTransactionInput
): Promise<FinanceTransaction> {
  const response = await fetch('/api/finance/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ transaction: FinanceTransaction }>(response);
  return payload.transaction;
}

export async function deleteFinanceTransactionRequest(id: string): Promise<void> {
  const response = await fetch(`/api/finance/transactions/${id}`, {
    method: 'DELETE',
  });
  await parseResponse<{ ok: true }>(response);
}

export async function updateFinanceTransactionRequest(
  id: string,
  input: FinanceTransactionInput
): Promise<FinanceTransaction> {
  const response = await fetch(`/api/finance/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ transaction: FinanceTransaction }>(response);
  return payload.transaction;
}
