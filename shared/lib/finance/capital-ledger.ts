import { FINANCE_CURRENCIES } from '@/entities/finance/model/categories';
import type {
  AccountPurpose,
  CapitalDepositSource,
  CapitalFlow,
  CapitalKind,
  FinanceAccount,
  FinanceAccountInput,
  FinanceAccountPurposeChange,
  FinanceBooks,
  FinanceCapitalGoal,
  FinanceCategoryKey,
  FinanceCurrency,
  FinanceTransaction,
  FinanceTransactionInput,
  FinanceTransfer,
  LedgerEntryType,
} from '@/entities/finance/model/types';
import { decAdd, decCmp, decDiv, decSub, decToNumber, isCreditEntry, money } from './decimal';
import { FinanceRuleError, type FinanceErrorCode } from './finance-error';

export interface LedgerResult<T> {
  books: FinanceBooks;
  duplicate: boolean;
  value: T;
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  debitAmount: number;
  creditAmount: number;
  feeAmount?: number;
  date: string;
  comment?: string;
  idempotencyKey: string;
  id?: string;
}

export interface CapitalMovementInput {
  accountId: string;
  kind: Exclude<CapitalKind, 'transfer' | 'fee'>;
  amount: number;
  direction?: 'in' | 'out';
  date: string;
  comment?: string;
  source?: CapitalDepositSource | null;
  expenseCategory?: FinanceCategoryKey | null;
  idempotencyKey: string;
  id?: string;
}

export interface GoalInput {
  name: string;
  goalType: FinanceCapitalGoal['goalType'];
  targetAmount: number;
  currency: FinanceCurrency;
  startDate: string;
  endDate: string;
  description?: string;
  id?: string;
}

export function emptyFinanceBooks(): FinanceBooks {
  return {
    accounts: [],
    transactions: [],
    transfers: [],
    purposeChanges: [],
    goals: [],
  };
}

export function createFinanceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `fin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function blankLedgerFields(): Pick<
  FinanceTransaction,
  | 'capitalFlow'
  | 'capitalKind'
  | 'transferId'
  | 'transferLeg'
  | 'source'
  | 'expenseCategory'
  | 'idempotencyKey'
  | 'counterpartyAccountId'
> {
  return {
    capitalFlow: null,
    capitalKind: null,
    transferId: null,
    transferLeg: null,
    source: null,
    expenseCategory: null,
    idempotencyKey: null,
    counterpartyAccountId: null,
  };
}

export function isRegularAccount(account: FinanceAccount): boolean {
  return (account.purpose ?? 'REGULAR') === 'REGULAR' && !account.archivedAt;
}

export function isCapitalAccount(account: FinanceAccount): boolean {
  return account.purpose === 'CAPITAL' && !account.archivedAt;
}

function fail(code: FinanceErrorCode): never {
  throw new FinanceRuleError(code);
}

function assertDate(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('INVALID_DATE');
  return value;
}

function assertCurrency(value: string | undefined): FinanceCurrency {
  if (!value || !FINANCE_CURRENCIES.includes(value as FinanceCurrency)) {
    fail('INVALID_CURRENCY');
  }
  return value as FinanceCurrency;
}

function positiveMoney(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('INVALID_AMOUNT');
  const rounded = money(value);
  if (decCmp(rounded, '0.00') <= 0) fail('INVALID_AMOUNT');
  return rounded;
}

function nonNegativeMoney(value: number | undefined): string {
  const amount = value ?? 0;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    fail('INVALID_AMOUNT');
  }
  return money(amount);
}

function asNumber(value: string): number {
  return decToNumber(value);
}

function stamp(): string {
  return new Date().toISOString();
}

function requireAccount(books: FinanceBooks, accountId: string): FinanceAccount {
  const account = books.accounts.find((item) => item.id === accountId && !item.archivedAt);
  if (!account) fail('ACCOUNT_NOT_FOUND');
  return account;
}

function requireAnyAccount(books: FinanceBooks, accountId: string): FinanceAccount {
  const account = books.accounts.find((item) => item.id === accountId);
  if (!account) fail('ACCOUNT_NOT_FOUND');
  return account;
}

function sortedTransactions(transactions: FinanceTransaction[], accountId: string) {
  return transactions
    .filter((transaction) => transaction.accountId === accountId)
    .slice()
    .sort((left, right) => {
      if (left.date !== right.date) return left.date < right.date ? -1 : 1;
      const leftCreated = left.createdAt ?? '';
      const rightCreated = right.createdAt ?? '';
      if (leftCreated !== rightCreated) return leftCreated < rightCreated ? -1 : 1;
      return left.id < right.id ? -1 : 1;
    });
}

export function balanceAt(
  account: FinanceAccount,
  transactions: FinanceTransaction[],
  untilDate?: string
): string {
  let balance = money(account.initialBalance);
  for (const transaction of sortedTransactions(transactions, account.id)) {
    if (untilDate && transaction.date > untilDate) break;
    const amount = money(transaction.amount);
    balance = isCreditEntry(transaction.type)
      ? money(asNumber(decAdd(balance, amount)))
      : money(asNumber(decSub(balance, amount)));
  }
  return balance;
}

function addMoney(left: string, right: string): string {
  return decAdd(left, right);
}

export function rebalance(books: FinanceBooks): FinanceBooks {
  return {
    ...books,
    accounts: books.accounts.map((account) => ({
      ...normalizeAccountShape(account),
      balance: asNumber(balanceAt(account, books.transactions)),
    })),
  };
}

function normalizeAccountShape(account: FinanceAccount): FinanceAccount {
  return {
    ...account,
    purpose: account.purpose ?? 'REGULAR',
    archivedAt: account.archivedAt ?? null,
    icon: account.icon ?? null,
    initialBalance: asNumber(money(account.initialBalance)),
  };
}

function commit<T>(before: FinanceBooks, after: FinanceBooks, value: T): LedgerResult<T> {
  return {
    books: rebalance(after),
    duplicate: false,
    value,
  };
}

function duplicateResult<T>(books: FinanceBooks, value: T): LedgerResult<T> {
  return { books: rebalance(books), duplicate: true, value };
}

export function purposeAt(
  account: FinanceAccount,
  changes: FinanceAccountPurposeChange[],
  date: string
): AccountPurpose {
  const own = changes
    .filter((change) => change.accountId === account.id)
    .slice()
    .sort(compareChanges);

  const applied = own.filter((change) => change.effectiveDate <= date);
  if (applied.length > 0) {
    return applied[applied.length - 1].toPurpose;
  }

  if (own.length > 0) {
    return own[0].fromPurpose ?? 'REGULAR';
  }

  return account.purpose ?? 'REGULAR';
}

function compareChanges(
  left: FinanceAccountPurposeChange,
  right: FinanceAccountPurposeChange
): number {
  if (left.effectiveDate !== right.effectiveDate) {
    return left.effectiveDate < right.effectiveDate ? -1 : 1;
  }
  const leftCreated = left.createdAt ?? '';
  const rightCreated = right.createdAt ?? '';
  if (leftCreated !== rightCreated) return leftCreated < rightCreated ? -1 : 1;
  return left.id < right.id ? -1 : 1;
}

function datesFrom(account: FinanceAccount, before: FinanceTransaction[], after: FinanceTransaction[], origin: string) {
  const dates = new Set<string>([origin]);
  for (const transaction of [...before, ...after]) {
    if (transaction.accountId === account.id && transaction.date >= origin) {
      dates.add(transaction.date);
    }
  }
  return [...dates].sort();
}

function assertNoOverdraw(
  account: FinanceAccount,
  before: FinanceTransaction[],
  after: FinanceTransaction[],
  origin: string
) {
  for (const date of datesFrom(account, before, after, origin)) {
    const previous = balanceAt(account, before, date);
    const next = balanceAt(account, after, date);
    if (decCmp(next, previous) < 0 && decCmp(next, '0.00') < 0) {
      fail('INSUFFICIENT_FUNDS');
    }
  }
}

function hasCapitalHistory(books: FinanceBooks, accountId: string): boolean {
  if (books.purposeChanges.some((change) => change.accountId === accountId)) return true;
  if (
    books.transactions.some(
      (transaction) => transaction.accountId === accountId && transaction.capitalFlow
    )
  ) {
    return true;
  }
  return books.transfers.some(
    (transfer) => transfer.fromAccountId === accountId || transfer.toAccountId === accountId
  );
}

function pickDefaultReplacement(accounts: FinanceAccount[], exceptId: string): string | null {
  const candidates = accounts
    .filter(
      (account) =>
        account.id !== exceptId &&
        (account.purpose ?? 'REGULAR') === 'REGULAR' &&
        !account.archivedAt
    )
    .slice()
    .sort((left, right) => {
      const leftCreated = left.createdAt ?? '';
      const rightCreated = right.createdAt ?? '';
      if (leftCreated !== rightCreated) return leftCreated < rightCreated ? -1 : 1;
      return left.id < right.id ? -1 : 1;
    });
  return candidates[0]?.id ?? null;
}

function withPurpose(
  books: FinanceBooks,
  accountId: string,
  purpose: AccountPurpose,
  date: string
): FinanceBooks {
  const account = requireAnyAccount(books, accountId);
  if (account.archivedAt) fail('ACCOUNT_NOT_FOUND');
  if (account.purpose === purpose) return books;

  const effectiveDate = assertDate(date);
  const balance = balanceAt(account, books.transactions, effectiveDate);
  const change: FinanceAccountPurposeChange = {
    id: createFinanceId(),
    accountId,
    fromPurpose: account.purpose ?? 'REGULAR',
    toPurpose: purpose,
    balanceAtChange: asNumber(balance),
    effectiveDate,
    createdAt: stamp(),
  };

  let accounts = books.accounts.map((item) =>
    item.id === accountId ? { ...item, purpose } : item
  );

  if (purpose === 'CAPITAL' && account.isDefault) {
    const replacementId = pickDefaultReplacement(accounts, accountId);
    accounts = accounts.map((item) => {
      if (item.id === accountId) return { ...item, isDefault: false, purpose: 'CAPITAL' };
      if (replacementId && item.id === replacementId) return { ...item, isDefault: true };
      if (replacementId) return { ...item, isDefault: false };
      return item;
    });
  }

  if (purpose === 'REGULAR') {
    const hasRegularDefault = accounts.some(
      (item) => item.isDefault && item.purpose === 'REGULAR' && !item.archivedAt
    );
    if (!hasRegularDefault) {
      accounts = accounts.map((item) =>
        item.id === accountId ? { ...item, isDefault: true, purpose: 'REGULAR' } : item
      );
    }
  }

  return {
    ...books,
    accounts,
    purposeChanges: [...books.purposeChanges, change],
  };
}

export function createAccount(
  books: FinanceBooks,
  input: FinanceAccountInput & { date?: string; id?: string }
): LedgerResult<FinanceAccount> {
  const name = input.name?.trim() ?? '';
  if (!name) fail('ACCOUNT_NAME_REQUIRED');
  const currency = assertCurrency(input.currency);
  const initialBalance = nonNegativeMoney(input.initialBalance);
  const purpose: AccountPurpose = input.purpose ?? 'REGULAR';
  const active = books.accounts.filter((account) => !account.archivedAt);
  const hasRegularDefault = active.some((account) => account.isDefault && isRegularAccount(account));
  const account: FinanceAccount = {
    id: input.id ?? createFinanceId(),
    name,
    currency,
    initialBalance: asNumber(initialBalance),
    balance: asNumber(initialBalance),
    isDefault: purpose === 'REGULAR' && !hasRegularDefault,
    purpose,
    archivedAt: null,
    icon: input.icon ?? null,
    createdAt: stamp(),
  };

  let next: FinanceBooks = { ...books, accounts: [...books.accounts, account] };
  if (purpose === 'CAPITAL') {
    const balance = money(account.initialBalance);
    next = {
      ...next,
      purposeChanges: [
        ...next.purposeChanges,
        {
          id: createFinanceId(),
          accountId: account.id,
          fromPurpose: null,
          toPurpose: 'CAPITAL',
          balanceAtChange: asNumber(balance),
          effectiveDate: assertDate(input.date ?? input.purposeDate ?? todayUtc()),
          createdAt: stamp(),
        },
      ],
    };
  }

  return commit(books, next, account);
}

export function updateAccount(
  books: FinanceBooks,
  accountId: string,
  input: FinanceAccountInput
): LedgerResult<FinanceAccount> {
  const account = requireAccount(books, accountId);
  const name = input.name?.trim() ?? '';
  if (!name) fail('ACCOUNT_NAME_REQUIRED');
  const currency = assertCurrency(input.currency);
  const initialBalance = nonNegativeMoney(input.initialBalance ?? account.initialBalance);
  const hasTransactions = books.transactions.some((transaction) => transaction.accountId === accountId);

  if (hasTransactions && currency !== account.currency) fail('CURRENCY_LOCKED');
  if (hasTransactions && decCmp(initialBalance, money(account.initialBalance)) !== 0) {
    fail('BALANCE_LOCKED');
  }

  let next: FinanceBooks = {
    ...books,
    accounts: books.accounts.map((item) =>
      item.id === accountId
        ? {
            ...item,
            name,
            currency,
            initialBalance: asNumber(initialBalance),
            icon: input.icon === undefined ? item.icon : input.icon,
          }
        : item
    ),
  };

  if (input.purpose && input.purpose !== account.purpose) {
    next = withPurpose(next, accountId, input.purpose, input.purposeDate ?? todayUtc());
  }

  const updated = next.accounts.find((item) => item.id === accountId) ?? account;
  return commit(books, next, updated);
}

export function setAccountPurpose(
  books: FinanceBooks,
  accountId: string,
  purpose: AccountPurpose,
  date: string
): LedgerResult<FinanceAccount> {
  const next = withPurpose(books, accountId, purpose, date);
  const account = next.accounts.find((item) => item.id === accountId);
  if (!account) fail('ACCOUNT_NOT_FOUND');
  return commit(books, next, account);
}

export function setDefaultAccount(
  books: FinanceBooks,
  accountId: string | null
): LedgerResult<string | null> {
  if (accountId) {
    const account = requireAccount(books, accountId);
    if (account.purpose === 'CAPITAL') fail('NOT_REGULAR_ACCOUNT');
  }

  const next: FinanceBooks = {
    ...books,
    accounts: books.accounts.map((account) => ({
      ...account,
      isDefault: accountId != null && account.id === accountId,
    })),
  };
  return commit(books, next, accountId);
}

export function archiveAccount(books: FinanceBooks, accountId: string): LedgerResult<FinanceAccount> {
  const account = requireAccount(books, accountId);
  const balance = balanceAt(account, books.transactions);
  if (decCmp(balance, '0.00') !== 0) fail('ARCHIVE_NONZERO');

  const archived: FinanceAccount = {
    ...account,
    archivedAt: stamp(),
    isDefault: false,
  };
  let accounts = books.accounts.map((item) => (item.id === accountId ? archived : item));
  if (account.isDefault) {
    const replacementId = pickDefaultReplacement(accounts, accountId);
    if (replacementId) {
      accounts = accounts.map((item) => ({
        ...item,
        isDefault: item.id === replacementId,
      }));
    }
  }

  return commit(books, { ...books, accounts }, archived);
}

export function deleteAccount(books: FinanceBooks, accountId: string): LedgerResult<string> {
  const account = requireAnyAccount(books, accountId);
  if (hasCapitalHistory(books, accountId) || account.purpose === 'CAPITAL') {
    fail('ARCHIVE_REQUIRED');
  }

  const next: FinanceBooks = {
    ...books,
    accounts: books.accounts.filter((item) => item.id !== accountId),
    transactions: books.transactions.filter((transaction) => transaction.accountId !== accountId),
    purposeChanges: books.purposeChanges.filter((change) => change.accountId !== accountId),
  };

  if (account.isDefault) {
    const replacementId = pickDefaultReplacement(next.accounts, accountId);
    next.accounts = next.accounts.map((item) => ({
      ...item,
      isDefault: replacementId != null && item.id === replacementId,
    }));
  }

  return commit(books, next, accountId);
}

function categoryForKind(kind: CapitalKind, expenseCategory?: FinanceCategoryKey | null): FinanceCategoryKey {
  if (expenseCategory) return expenseCategory;
  if (kind === 'deposit') return 'other_income';
  if (kind === 'interest' || kind === 'investment_income') return 'investment';
  return 'other_expense';
}

function movementDirection(input: CapitalMovementInput): 'in' | 'out' {
  if (input.kind === 'withdrawal') return 'out';
  if (input.kind === 'deposit' || input.kind === 'interest' || input.kind === 'investment_income') {
    return 'in';
  }
  if (input.direction !== 'in' && input.direction !== 'out') fail('INVALID_AMOUNT');
  return input.direction;
}

function flowForKind(kind: CapitalMovementInput['kind']): CapitalFlow {
  if (kind === 'deposit') return 'contribution';
  if (kind === 'withdrawal') return 'withdrawal';
  if (kind === 'interest' || kind === 'investment_income') return 'yield';
  if (kind === 'revaluation') return 'revaluation';
  return 'adjustment';
}

function entryType(direction: 'in' | 'out'): LedgerEntryType {
  return direction === 'in' ? 'capital_in' : 'capital_out';
}

export function createCapitalMovement(
  books: FinanceBooks,
  input: CapitalMovementInput
): LedgerResult<FinanceTransaction> {
  const existing = books.transactions.find(
    (transaction) => transaction.idempotencyKey && transaction.idempotencyKey === input.idempotencyKey
  );
  if (existing) return duplicateResult(books, existing);

  if (!input.idempotencyKey?.trim()) fail('DUPLICATE_REQUEST');
  const account = requireAccount(books, input.accountId);
  const date = assertDate(input.date);
  if (purposeAt(account, books.purposeChanges, date) !== 'CAPITAL') {
    fail('NOT_CAPITAL_ACCOUNT');
  }

  const direction = movementDirection(input);
  const amount = positiveMoney(input.amount);
  const createdAt = stamp();
  const transaction: FinanceTransaction = {
    id: input.id ?? createFinanceId(),
    accountId: account.id,
    type: entryType(direction),
    amount: asNumber(amount),
    category: categoryForKind(input.kind, input.expenseCategory),
    description: input.comment?.trim() ?? '',
    date,
    createdAt,
    capitalFlow: flowForKind(input.kind),
    capitalKind: input.kind,
    transferId: null,
    transferLeg: null,
    source: input.kind === 'deposit' ? (input.source ?? 'other') : null,
    expenseCategory: input.kind === 'withdrawal' ? (input.expenseCategory ?? null) : null,
    idempotencyKey: input.idempotencyKey,
    counterpartyAccountId: null,
  };

  const nextTransactions = [...books.transactions, transaction];
  if (direction === 'out') {
    assertNoOverdraw(account, books.transactions, nextTransactions, date);
  }

  return commit(books, { ...books, transactions: nextTransactions }, transaction);
}

export function updateCapitalMovement(
  books: FinanceBooks,
  transactionId: string,
  input: CapitalMovementInput
): LedgerResult<FinanceTransaction> {
  const current = books.transactions.find((transaction) => transaction.id === transactionId);
  if (!current || !current.capitalKind || current.transferId) fail('TRANSACTION_NOT_FOUND');

  const without = books.transactions.filter((transaction) => transaction.id !== transactionId);
  const draft: FinanceBooks = { ...books, transactions: without };
  const created = createCapitalMovement(draft, {
    ...input,
    id: current.id,
    idempotencyKey: current.idempotencyKey ?? input.idempotencyKey,
  });
  if (created.duplicate) return created;

  const account = requireAnyAccount(books, current.accountId);
  assertNoOverdraw(account, books.transactions, created.books.transactions, current.date);
  const nextAccount = created.books.accounts.find((item) => item.id === input.accountId);
  if (nextAccount) {
    assertNoOverdraw(nextAccount, books.transactions, created.books.transactions, input.date);
  }
  return created;
}

export function deleteTransaction(books: FinanceBooks, transactionId: string): LedgerResult<string> {
  const current = books.transactions.find((transaction) => transaction.id === transactionId);
  if (!current) fail('TRANSACTION_NOT_FOUND');
  if (current.transferId) fail('PARTIAL_TRANSFER');

  const nextTransactions = books.transactions.filter((transaction) => transaction.id !== transactionId);
  if (current.capitalFlow) {
    const account = requireAnyAccount(books, current.accountId);
    assertNoOverdraw(account, books.transactions, nextTransactions, current.date);
  }

  return commit(books, { ...books, transactions: nextTransactions }, transactionId);
}

function transferFlows(
  fromPurpose: AccountPurpose,
  toPurpose: AccountPurpose
): { debit: CapitalFlow | null; credit: CapitalFlow | null } {
  if (fromPurpose === 'CAPITAL' && toPurpose === 'CAPITAL') {
    return { debit: 'internal', credit: 'internal' };
  }
  if (fromPurpose === 'REGULAR' && toPurpose === 'CAPITAL') {
    return { debit: null, credit: 'contribution' };
  }
  if (fromPurpose === 'CAPITAL' && toPurpose === 'REGULAR') {
    return { debit: 'withdrawal', credit: null };
  }
  return { debit: null, credit: null };
}

function buildTransfer(
  books: FinanceBooks,
  input: TransferInput,
  transferId: string,
  createdAt: string
): { transfer: FinanceTransfer; legs: FinanceTransaction[] } {
  if (!input.idempotencyKey?.trim()) fail('DUPLICATE_REQUEST');
  if (input.fromAccountId === input.toAccountId) fail('SAME_ACCOUNT');

  const from = requireAccount(books, input.fromAccountId);
  const to = requireAccount(books, input.toAccountId);
  const date = assertDate(input.date);
  const debit = positiveMoney(input.debitAmount);
  const credit = positiveMoney(input.creditAmount);
  const fee = nonNegativeMoney(input.feeAmount);

  if (from.currency === to.currency && decCmp(debit, credit) !== 0) {
    fail('INVALID_AMOUNT');
  }

  const fromPurpose = purposeAt(from, books.purposeChanges, date);
  const toPurpose = purposeAt(to, books.purposeChanges, date);
  const flows = transferFlows(fromPurpose, toPurpose);
  const rate = from.currency === to.currency ? '1.00000000' : decDiv(credit, debit);

  const transfer: FinanceTransfer = {
    id: transferId,
    idempotencyKey: input.idempotencyKey,
    fromAccountId: from.id,
    toAccountId: to.id,
    debitAmount: asNumber(debit),
    creditAmount: asNumber(credit),
    exchangeRate: asNumber(rate),
    feeAmount: asNumber(fee),
    date,
    comment: input.comment?.trim() ?? '',
    createdAt,
  };

  const legs: FinanceTransaction[] = [
    {
      id: createFinanceId(),
      accountId: from.id,
      type: 'transfer_out',
      amount: asNumber(debit),
      category: 'other_expense',
      description: transfer.comment,
      date,
      createdAt,
      capitalFlow: flows.debit,
      capitalKind: 'transfer',
      transferId,
      transferLeg: 'debit',
      source: null,
      expenseCategory: null,
      idempotencyKey: `${input.idempotencyKey}:debit`,
      counterpartyAccountId: to.id,
    },
    {
      id: createFinanceId(),
      accountId: to.id,
      type: 'transfer_in',
      amount: asNumber(credit),
      category: 'other_income',
      description: transfer.comment,
      date,
      createdAt,
      capitalFlow: flows.credit,
      capitalKind: 'transfer',
      transferId,
      transferLeg: 'credit',
      source: null,
      expenseCategory: null,
      idempotencyKey: `${input.idempotencyKey}:credit`,
      counterpartyAccountId: from.id,
    },
  ];

  if (decCmp(fee, '0.00') > 0) {
    legs.push({
      id: createFinanceId(),
      accountId: from.id,
      type: 'transfer_out',
      amount: asNumber(fee),
      category: 'services',
      description: transfer.comment,
      date,
      createdAt,
      capitalFlow: 'fee',
      capitalKind: 'fee',
      transferId,
      transferLeg: 'fee',
      source: null,
      expenseCategory: null,
      idempotencyKey: `${input.idempotencyKey}:fee`,
      counterpartyAccountId: to.id,
    });
  }

  return { transfer, legs };
}

function stripTransfer(books: FinanceBooks, transferId: string): FinanceBooks {
  return {
    ...books,
    transfers: books.transfers.filter((transfer) => transfer.id !== transferId),
    transactions: books.transactions.filter((transaction) => transaction.transferId !== transferId),
  };
}

export function createTransfer(books: FinanceBooks, input: TransferInput): LedgerResult<FinanceTransfer> {
  const existing = books.transfers.find((transfer) => transfer.idempotencyKey === input.idempotencyKey);
  if (existing) return duplicateResult(books, existing);

  const createdAt = stamp();
  const transferId = input.id ?? createFinanceId();
  const built = buildTransfer(books, input, transferId, createdAt);
  const next: FinanceBooks = {
    ...books,
    transfers: [...books.transfers, built.transfer],
    transactions: [...books.transactions, ...built.legs],
  };
  const from = requireAccount(books, input.fromAccountId);
  assertNoOverdraw(from, books.transactions, next.transactions, built.transfer.date);
  return commit(books, next, built.transfer);
}

export function updateTransfer(
  books: FinanceBooks,
  transferId: string,
  input: TransferInput
): LedgerResult<FinanceTransfer> {
  const current = books.transfers.find((transfer) => transfer.id === transferId);
  if (!current) fail('TRANSFER_NOT_FOUND');

  const stripped = stripTransfer(books, transferId);
  const built = buildTransfer(
    stripped,
    { ...input, idempotencyKey: current.idempotencyKey, id: current.id },
    current.id,
    current.createdAt ?? stamp()
  );
  const next: FinanceBooks = {
    ...stripped,
    transfers: [...stripped.transfers, built.transfer],
    transactions: [...stripped.transactions, ...built.legs],
  };

  for (const accountId of new Set([
    current.fromAccountId,
    current.toAccountId,
    input.fromAccountId,
    input.toAccountId,
  ])) {
    const account = books.accounts.find((item) => item.id === accountId);
    if (!account) continue;
    assertNoOverdraw(
      account,
      books.transactions,
      next.transactions,
      [current.date, input.date].sort()[0]
    );
  }

  return commit(books, next, built.transfer);
}

export function deleteTransfer(books: FinanceBooks, transferId: string): LedgerResult<string> {
  const current = books.transfers.find((transfer) => transfer.id === transferId);
  if (!current) fail('TRANSFER_NOT_FOUND');
  const next = stripTransfer(books, transferId);

  for (const accountId of [current.fromAccountId, current.toAccountId]) {
    const account = books.accounts.find((item) => item.id === accountId);
    if (!account) continue;
    assertNoOverdraw(account, books.transactions, next.transactions, current.date);
  }

  return commit(books, next, transferId);
}

export function createRegularTransaction(
  books: FinanceBooks,
  input: FinanceTransactionInput & { id?: string }
): LedgerResult<FinanceTransaction> {
  const account = requireAccount(books, input.accountId);
  if (account.purpose === 'CAPITAL') fail('NOT_REGULAR_ACCOUNT');
  if (input.type !== 'income' && input.type !== 'expense') fail('INVALID_AMOUNT');
  const amount = positiveMoney(input.amount);
  const date = assertDate(input.date);
  if (!input.category) fail('INVALID_AMOUNT');

  const transaction: FinanceTransaction = {
    id: input.id ?? createFinanceId(),
    accountId: account.id,
    type: input.type,
    amount: asNumber(amount),
    category: input.category,
    description: input.description?.trim() ?? '',
    date,
    createdAt: stamp(),
    ...blankLedgerFields(),
  };

  return commit(books, { ...books, transactions: [transaction, ...books.transactions] }, transaction);
}

export function updateRegularTransaction(
  books: FinanceBooks,
  transactionId: string,
  input: FinanceTransactionInput
): LedgerResult<FinanceTransaction> {
  const current = books.transactions.find((transaction) => transaction.id === transactionId);
  if (!current) fail('TRANSACTION_NOT_FOUND');
  if (current.transferId || current.capitalFlow) fail('PARTIAL_TRANSFER');

  const account = requireAccount(books, input.accountId);
  if (account.purpose === 'CAPITAL') fail('NOT_REGULAR_ACCOUNT');
  if (input.type !== 'income' && input.type !== 'expense') fail('INVALID_AMOUNT');
  const amount = positiveMoney(input.amount);
  const date = assertDate(input.date);

  const transaction: FinanceTransaction = {
    ...current,
    accountId: account.id,
    type: input.type,
    amount: asNumber(amount),
    category: input.category,
    description: input.description?.trim() ?? '',
    date,
  };

  const nextTransactions = books.transactions.map((item) =>
    item.id === transactionId ? transaction : item
  );
  return commit(books, { ...books, transactions: nextTransactions }, transaction);
}

export function createGoal(books: FinanceBooks, input: GoalInput): LedgerResult<FinanceCapitalGoal> {
  const goal = normalizeGoal(input, input.id ?? createFinanceId(), stamp());
  return commit(books, { ...books, goals: [...books.goals, goal] }, goal);
}

export function updateGoal(
  books: FinanceBooks,
  goalId: string,
  input: GoalInput
): LedgerResult<FinanceCapitalGoal> {
  const current = books.goals.find((goal) => goal.id === goalId);
  if (!current) fail('GOAL_NOT_FOUND');
  const goal = normalizeGoal(input, current.id, current.createdAt ?? stamp());
  goal.archivedAt = current.archivedAt;
  goal.celebratedAt = current.celebratedAt;
  const next = books.goals.map((item) => (item.id === goalId ? goal : item));
  return commit(books, { ...books, goals: next }, goal);
}

export function archiveGoal(books: FinanceBooks, goalId: string): LedgerResult<FinanceCapitalGoal> {
  const current = books.goals.find((goal) => goal.id === goalId);
  if (!current) fail('GOAL_NOT_FOUND');
  const goal = { ...current, archivedAt: stamp() };
  return commit(
    books,
    { ...books, goals: books.goals.map((item) => (item.id === goalId ? goal : item)) },
    goal
  );
}

export function deleteGoal(books: FinanceBooks, goalId: string): LedgerResult<string> {
  if (!books.goals.some((goal) => goal.id === goalId)) fail('GOAL_NOT_FOUND');
  return commit(
    books,
    { ...books, goals: books.goals.filter((goal) => goal.id !== goalId) },
    goalId
  );
}

export function celebrateGoal(books: FinanceBooks, goalId: string): LedgerResult<FinanceCapitalGoal> {
  const current = books.goals.find((goal) => goal.id === goalId);
  if (!current) fail('GOAL_NOT_FOUND');
  if (current.celebratedAt) return duplicateResult(books, current);
  const goal = { ...current, celebratedAt: stamp() };
  return commit(
    books,
    { ...books, goals: books.goals.map((item) => (item.id === goalId ? goal : item)) },
    goal
  );
}

function normalizeGoal(input: GoalInput, id: string, createdAt: string): FinanceCapitalGoal {
  const name = input.name?.trim() ?? '';
  if (!name) fail('GOAL_NAME_REQUIRED');
  if (input.goalType !== 'period_savings' && input.goalType !== 'capital_target') {
    fail('GOAL_DATES');
  }
  const startDate = assertDate(input.startDate);
  const endDate = assertDate(input.endDate);
  if (startDate > endDate) fail('GOAL_DATES');
  return {
    id,
    name,
    goalType: input.goalType,
    targetAmount: asNumber(positiveMoney(input.targetAmount)),
    currency: assertCurrency(input.currency),
    startDate,
    endDate,
    description: input.description?.trim() ?? '',
    archivedAt: null,
    celebratedAt: null,
    createdAt,
  };
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function regularIncomeExpenseTotal(
  transactions: FinanceTransaction[],
  type: 'income' | 'expense'
): string {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => addMoney(sum, money(transaction.amount)), '0.00');
}

export { assertNoOverdraw };
