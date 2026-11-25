import { describe, expect, it } from 'vitest';
import type { FinanceBooks } from '@/entities/finance/model/types';
import { buildCapitalAnalytics } from './capital-analytics';
import {
  archiveAccount,
  createAccount,
  createCapitalMovement,
  createRegularTransaction,
  createTransfer,
  deleteAccount,
  deleteTransaction,
  deleteTransfer,
  regularIncomeExpenseTotal,
  rebalance,
  setAccountPurpose,
  updateCapitalMovement,
  updateTransfer,
  type TransferInput,
} from './capital-ledger';
import { goalProgress, suggestGoalDates } from './capital-goals';
import { FinanceRuleError } from './finance-error';
import { normalizePersistedFinanceState } from './finance-books';
import { emptyRateSeries, type RateBook } from './historical-rates';

function usdBook(today: string): RateBook {
  return { series: emptyRateSeries(), current: null, today };
}

function bynBook(today: string, usdPerDate: Array<{ date: string; bynPerUnit: string }> = []): RateBook {
  return {
    series: { quotes: { USD: usdPerDate, RUB: [], CNY: [] } },
    current: null,
    today,
  };
}

function booksOf(result: { books: FinanceBooks }): FinanceBooks {
  return result.books;
}

function accountId(books: FinanceBooks, name: string): string {
  const account = books.accounts.find((item) => item.name === name);
  if (!account) throw new Error(`Missing account ${name}`);
  return account.id;
}

describe('capital ledger', () => {
  it('creates regular and capital accounts and migrates legacy accounts to regular', () => {
    let books = createAccount(booksOf({ books: emptyBooks() }), {
      name: 'Карта',
      currency: 'USD',
      initialBalance: 2000,
      purpose: 'REGULAR',
      date: '2026-10-01',
    }).books;
    books = createAccount(books, {
      name: 'Депозит',
      currency: 'USD',
      initialBalance: 1000,
      purpose: 'CAPITAL',
      date: '2026-10-01',
    }).books;

    expect(books.accounts.find((account) => account.name === 'Карта')?.purpose).toBe('REGULAR');
    expect(books.accounts.find((account) => account.name === 'Депозит')?.purpose).toBe('CAPITAL');
    expect(books.accounts.find((account) => account.name === 'Карта')?.isDefault).toBe(true);
    expect(books.accounts.find((account) => account.name === 'Депозит')?.isDefault).toBe(false);

    const persisted = normalizePersistedFinanceState({
      financeAccounts: [{ id: 'legacy', name: 'Старый', currency: 'BYN', initialBalance: 40, balance: 40, isDefault: true }],
      financeTransactions: [{ id: 'tx', accountId: 'legacy', type: 'expense', amount: 5, category: 'products', description: '', date: '2026-01-01' }],
    });
    expect(persisted.financeAccounts[0].purpose).toBe('REGULAR');
    expect(persisted.financeTransfers).toEqual([]);
    expect(persisted.financeTransactions[0].capitalFlow).toBeNull();
  });

  it('moves an existing account into capital without creating income', () => {
    let books = createAccount(emptyBooks(), {
      name: 'Карта',
      currency: 'USD',
      initialBalance: 800,
      purpose: 'REGULAR',
      date: '2026-01-01',
    }).books;
    books = createRegularTransaction(books, {
      accountId: accountId(books, 'Карта'),
      type: 'expense',
      amount: 50,
      category: 'products',
      date: '2026-02-01',
    }).books;
    const beforeIncome = regularIncomeExpenseTotal(books.transactions, 'income');
    books = setAccountPurpose(books, accountId(books, 'Карта'), 'CAPITAL', '2026-03-01').books;

    const account = books.accounts[0];
    expect(account.balance).toBe(750);
    expect(account.purpose).toBe('CAPITAL');
    expect(books.transactions.some((transaction) => transaction.type === 'income')).toBe(false);
    expect(regularIncomeExpenseTotal(books.transactions, 'income')).toBe(beforeIncome);
    expect(books.purposeChanges.at(-1)?.balanceAtChange).toBe(750);

    const analytics = buildCapitalAnalytics(books, 'USD', usdBook('2026-03-15'), 'all');
    expect(analytics.months.find((row) => row.month === '2026-03')?.netSavings.amount).toBe(0);
    expect(analytics.total.amount).toBe(750);
  });

  it('runs the control scenario without double counting', () => {
    let books = seedControl();
    books = createTransfer(books, transferInput(books, 'Карта', 'Депозит', 500, '2026-11-15', 'nov')).books;

    expect(balance(books, 'Карта')).toBe(1500);
    expect(balance(books, 'Депозит')).toBe(1500);
    expect(balance(books, 'Карта') + balance(books, 'Депозит')).toBe(3000);
    let analytics = buildCapitalAnalytics(books, 'USD', usdBook('2026-12-20'), 'all');
    expect(analytics.months.find((row) => row.month === '2026-11')?.netSavings.amount).toBe(500);
    expect(regularIncomeExpenseTotal(books.transactions, 'income')).toBe('0.00');
    expect(regularIncomeExpenseTotal(books.transactions, 'expense')).toBe('0.00');

    books = createTransfer(books, transferInput(books, 'Депозит', 'Карта', 1000, '2026-12-10', 'dec')).books;
    expect(balance(books, 'Карта')).toBe(2500);
    expect(balance(books, 'Депозит')).toBe(500);
    expect(balance(books, 'Карта') + balance(books, 'Депозит')).toBe(3000);
    analytics = buildCapitalAnalytics(books, 'USD', usdBook('2026-12-20'), 'all');
    expect(analytics.months.find((row) => row.month === '2026-12')?.netSavings.amount).toBe(-1000);
    expect(regularIncomeExpenseTotal(books.transactions, 'income')).toBe('0.00');
    expect(regularIncomeExpenseTotal(books.transactions, 'expense')).toBe('0.00');
    expect(analytics.months.find((row) => row.month === '2026-11')?.revaluation.amount).toBe(0);
    expect(analytics.months.find((row) => row.month === '2026-12')?.revaluation.amount).toBe(0);
    expect(analytics.history.filter((row) => row.transferId).length).toBe(2);
    expect(analytics.series.some((point) => (point.total.amount ?? 0) > 1000)).toBe(true);
    expect(analytics.series.some((point) => (point.total.amount ?? 0) < 1500)).toBe(true);
  });

  it('does not count a same-day transfer inside the opening composition', () => {
    let books = createAccount(emptyBooks(), {
      name: 'Карта',
      currency: 'USD',
      initialBalance: 2000,
      purpose: 'REGULAR',
      date: '2026-11-25',
    }).books;
    books = createAccount(books, {
      name: 'Копилка',
      currency: 'USD',
      initialBalance: 1000,
      purpose: 'CAPITAL',
      date: '2026-11-25',
    }).books;
    books = createTransfer(books, transferInput(books, 'Карта', 'Копилка', 500, '2026-11-25', 'same-day')).books;

    const analytics = buildCapitalAnalytics(books, 'USD', usdBook('2026-11-25'), 'all');
    const november = analytics.months.find((row) => row.month === '2026-11');
    expect(november?.opening.amount).toBe(0);
    expect(november?.contributed.amount).toBe(500);
    expect(november?.netSavings.amount).toBe(500);
    expect(november?.other.amount).toBe(1000);
    expect(november?.revaluation.amount).toBe(0);
    expect(november?.closing.amount).toBe(1500);
    expect(analytics.history.find((row) => row.kind === 'composition')?.amount).toBe(1000);
    expect(regularIncomeExpenseTotal(books.transactions, 'income')).toBe('0.00');
    expect(regularIncomeExpenseTotal(books.transactions, 'expense')).toBe('0.00');
  });

  it('records a direct deposit once and a withdrawal outside tracked accounts', () => {
    let books = createAccount(emptyBooks(), {
      name: 'Копилка',
      currency: 'USD',
      initialBalance: 0,
      purpose: 'CAPITAL',
      date: '2026-11-01',
    }).books;
    books = createCapitalMovement(books, {
      accountId: accountId(books, 'Копилка'),
      kind: 'deposit',
      amount: 100,
      date: '2026-11-02',
      source: 'cash',
      idempotencyKey: 'dep-1',
      comment: 'наличные',
    }).books;
    books = createCapitalMovement(books, {
      accountId: accountId(books, 'Копилка'),
      kind: 'withdrawal',
      amount: 40,
      date: '2026-11-03',
      expenseCategory: 'products',
      idempotencyKey: 'out-1',
    }).books;

    expect(balance(books, 'Копилка')).toBe(60);
    const analytics = buildCapitalAnalytics(books, 'USD', usdBook('2026-11-20'), 'month');
    expect(analytics.monthNet.amount).toBe(60);
    expect(books.transactions.filter((transaction) => transaction.type === 'income' || transaction.type === 'expense')).toHaveLength(0);
    expect(books.transactions.some((transaction) => transaction.expenseCategory === 'products')).toBe(true);
  });

  it('keeps both sides of a cross-currency transfer and a fee', () => {
    let books = createAccount(emptyBooks(), {
      name: 'BYN',
      currency: 'BYN',
      initialBalance: 1000,
      purpose: 'REGULAR',
      date: '2026-11-01',
    }).books;
    books = createAccount(books, {
      name: 'USD',
      currency: 'USD',
      initialBalance: 0,
      purpose: 'CAPITAL',
      date: '2026-11-01',
    }).books;
    const result = createTransfer(books, {
      fromAccountId: accountId(books, 'BYN'),
      toAccountId: accountId(books, 'USD'),
      debitAmount: 330,
      creditAmount: 100,
      feeAmount: 2,
      date: '2026-11-10',
      idempotencyKey: 'fx-1',
    });
    books = result.books;

    expect(balance(books, 'BYN')).toBe(668);
    expect(balance(books, 'USD')).toBe(100);
    expect(result.value.debitAmount).toBe(330);
    expect(result.value.creditAmount).toBe(100);
    expect(result.value.feeAmount).toBe(2);

    const analytics = buildCapitalAnalytics(
      books,
      'USD',
      bynBook('2026-11-20', [{ date: '2026-11-10', bynPerUnit: '3.20' }]),
      'month'
    );
    expect(analytics.monthNet.amount).toBe(100);
    expect(result.value.creditAmount).toBe(100);
  });

  it('rejects insufficient funds, the same account, and a foreign account', () => {
    const books = createAccount(emptyBooks(), {
      name: 'Карта',
      currency: 'USD',
      initialBalance: 10,
      purpose: 'REGULAR',
      date: '2026-11-01',
    }).books;
    const capital = createAccount(books, {
      name: 'Депозит',
      currency: 'USD',
      initialBalance: 0,
      purpose: 'CAPITAL',
      date: '2026-11-01',
    }).books;

    expect(() =>
      createTransfer(capital, transferInput(capital, 'Карта', 'Депозит', 11, '2026-11-02', 'too-much'))
    ).toThrow(FinanceRuleError);
    expect(() =>
      createTransfer(capital, {
        ...transferInput(capital, 'Карта', 'Депозит', 1, '2026-11-02', 'same'),
        toAccountId: accountId(capital, 'Карта'),
      })
    ).toThrowError(expect.objectContaining({ code: 'SAME_ACCOUNT' }));
    expect(() =>
      createTransfer(capital, {
        ...transferInput(capital, 'Карта', 'Депозит', 1, '2026-11-02', 'foreign'),
        fromAccountId: 'someone-else',
      })
    ).toThrowError(expect.objectContaining({ code: 'ACCOUNT_NOT_FOUND' }));
  });

  it('does not duplicate a retried transfer and serializes competing transfers', async () => {
    let books = createAccount(emptyBooks(), {
      name: 'Карта',
      currency: 'USD',
      initialBalance: 100,
      purpose: 'REGULAR',
      date: '2026-11-01',
    }).books;
    books = createAccount(books, {
      name: 'Депозит',
      currency: 'USD',
      initialBalance: 0,
      purpose: 'CAPITAL',
      date: '2026-11-01',
    }).books;
    const input = transferInput(books, 'Карта', 'Депозит', 40, '2026-11-02', 'same-key');
    const first = createTransfer(books, input);
    const second = createTransfer(first.books, input);
    expect(second.duplicate).toBe(true);
    expect(second.books.transfers).toHaveLength(1);
    expect(balance(second.books, 'Карта')).toBe(60);

    let raced = createAccount(emptyBooks(), {
      name: 'Карта',
      currency: 'USD',
      initialBalance: 100,
      purpose: 'REGULAR',
      date: '2026-11-01',
    }).books;
    raced = createAccount(raced, {
      name: 'Депозит',
      currency: 'USD',
      initialBalance: 0,
      purpose: 'CAPITAL',
      date: '2026-11-01',
    }).books;
    const queue = createSerialQueue();
    const results = await Promise.allSettled([
      queue(() => {
        const next = createTransfer(raced, transferInput(raced, 'Карта', 'Депозит', 80, '2026-11-03', 'a'));
        raced = next.books;
      }),
      queue(() => {
        const next = createTransfer(raced, transferInput(raced, 'Карта', 'Депозит', 80, '2026-11-03', 'b'));
        raced = next.books;
      }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(balance(raced, 'Карта')).toBe(20);
    expect(raced.transfers).toHaveLength(1);
  });

  it('edits and deletes a transfer atomically and rejects a partial delete', () => {
    let books = seedControl();
    const created = createTransfer(books, transferInput(books, 'Карта', 'Депозит', 500, '2026-11-15', 'edit-me'));
    books = created.books;
    const legId = books.transactions.find((transaction) => transaction.transferId === created.value.id)?.id;
    expect(() => deleteTransaction(books, legId!)).toThrowError(
      expect.objectContaining({ code: 'PARTIAL_TRANSFER' })
    );
    expect(books.transfers).toHaveLength(1);

    books = updateTransfer(books, created.value.id, {
      ...transferInput(books, 'Карта', 'Депозит', 200, '2026-11-16', 'edit-me'),
    }).books;
    expect(balance(books, 'Карта')).toBe(1800);
    expect(balance(books, 'Депозит')).toBe(1200);
    expect(books.transfers).toHaveLength(1);
    expect(books.transactions.filter((transaction) => transaction.transferId === created.value.id)).toHaveLength(2);

    books = deleteTransfer(books, created.value.id).books;
    expect(books.transfers).toHaveLength(0);
    expect(books.transactions.filter((transaction) => transaction.transferId)).toHaveLength(0);
    expect(balance(books, 'Карта')).toBe(2000);
    expect(balance(books, 'Депозит')).toBe(1000);
  });

  it('recalculates analytics after a backdated change and keeps an internal transfer neutral', () => {
    let books = createAccount(emptyBooks(), {
      name: 'A',
      currency: 'USD',
      initialBalance: 0,
      purpose: 'CAPITAL',
      date: '2026-11-01',
    }).books;
    books = createAccount(books, {
      name: 'B',
      currency: 'USD',
      initialBalance: 0,
      purpose: 'CAPITAL',
      date: '2026-11-01',
    }).books;
    const deposit = createCapitalMovement(books, {
      accountId: accountId(books, 'A'),
      kind: 'deposit',
      amount: 100,
      date: '2026-11-05',
      source: 'external',
      idempotencyKey: 'd',
    });
    books = deposit.books;
    books = createTransfer(books, transferInput(books, 'A', 'B', 20, '2026-11-06', 'internal')).books;
    books = createCapitalMovement(books, {
      accountId: accountId(books, 'A'),
      kind: 'withdrawal',
      amount: 30,
      date: '2026-11-20',
      idempotencyKey: 'w',
    }).books;

    expect(() =>
      createCapitalMovement(books, {
        accountId: accountId(books, 'A'),
        kind: 'withdrawal',
        amount: 60,
        date: '2026-11-10',
        idempotencyKey: 'late',
      })
    ).toThrowError(expect.objectContaining({ code: 'INSUFFICIENT_FUNDS' }));

    books = updateCapitalMovement(books, deposit.value.id, {
      accountId: accountId(books, 'A'),
      kind: 'deposit',
      amount: 200,
      date: '2026-11-05',
      source: 'external',
      idempotencyKey: 'd',
    }).books;
    const analytics = buildCapitalAnalytics(books, 'USD', usdBook('2026-11-25'), 'month');
    expect(analytics.monthNet.amount).toBe(170);
    expect(analytics.months[0].contributed.amount).toBe(200);
    expect(analytics.months[0].withdrawn.amount).toBe(30);
  });

  it('does not treat interest, revaluation, or a missing rate as new savings', () => {
    let books = createAccount(emptyBooks(), {
      name: 'Депозит',
      currency: 'USD',
      initialBalance: 100,
      purpose: 'CAPITAL',
      date: '2026-11-01',
    }).books;
    books = createCapitalMovement(books, {
      accountId: accountId(books, 'Депозит'),
      kind: 'interest',
      amount: 5,
      date: '2026-11-15',
      idempotencyKey: 'int',
    }).books;
    books = createCapitalMovement(books, {
      accountId: accountId(books, 'Депозит'),
      kind: 'revaluation',
      amount: 8,
      direction: 'in',
      date: '2026-11-16',
      idempotencyKey: 'rev',
    }).books;

    const analytics = buildCapitalAnalytics(books, 'USD', usdBook('2026-11-20'), 'month');
    expect(analytics.monthNet.amount).toBe(0);
    expect(analytics.months[0].yield.amount).toBe(5);
    expect(analytics.total.amount).toBe(113);
    expect(analytics.months[0].revaluation.amount).toBe(8);

    const missing = buildCapitalAnalytics(books, 'BYN', bynBook('2026-11-20'), 'month');
    expect(missing.total.amount).toBeNull();
    expect(missing.total.amount).not.toBe(0);

    const approximate = buildCapitalAnalytics(
      books,
      'BYN',
      bynBook('2026-11-20', [{ date: '2026-11-01', bynPerUnit: '3.00' }]),
      'month'
    );
    expect(approximate.total.approximate).toBe(true);
    expect(approximate.total.rateDate).toBe('2026-11-01');
    expect(approximate.total.amount).toBe(339);
  });

  it('tracks several goals, withdrawals, overfill, and a frozen result', () => {
    let books = createAccount(emptyBooks(), {
      name: 'Депозит',
      currency: 'USD',
      initialBalance: 1000,
      purpose: 'CAPITAL',
      date: '2026-10-01',
    }).books;
    const monthGoal = {
      name: 'Ноябрь',
      goalType: 'period_savings' as const,
      targetAmount: 100,
      currency: 'USD' as const,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      description: '',
    };
    const yearGoal = {
      ...monthGoal,
      name: 'Год',
      targetAmount: 5000,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    const targetGoal = {
      ...monthGoal,
      name: 'Квартира',
      goalType: 'capital_target' as const,
      targetAmount: 10_000,
      startDate: '2026-01-01',
      endDate: '2031-12-31',
    };
    books = {
      ...books,
      goals: [
        { ...monthGoal, id: 'm', archivedAt: null, celebratedAt: null },
        { ...yearGoal, id: 'y', archivedAt: null, celebratedAt: null },
        { ...targetGoal, id: 't', archivedAt: null, celebratedAt: null },
      ],
    };
    const deposit = createCapitalMovement(books, {
      accountId: accountId(books, 'Депозит'),
      kind: 'deposit',
      amount: 125,
      date: '2026-11-10',
      source: 'gift',
      idempotencyKey: 'g',
    });
    books = deposit.books;
    const rates = usdBook('2026-11-20');
    expect(goalProgress(books.goals[0], books, rates).percent).toBe(125);
    expect(goalProgress(books.goals[0], books, rates).barPercent).toBe(100);
    expect(goalProgress(books.goals[1], books, rates).current.amount).toBe(125);
    expect(goalProgress(books.goals[2], books, rates).current.amount).toBe(1125);

    books = createCapitalMovement(books, {
      accountId: accountId(books, 'Депозит'),
      kind: 'withdrawal',
      amount: 200,
      date: '2026-11-12',
      idempotencyKey: 'back',
    }).books;
    expect(goalProgress(books.goals[0], books, rates).current.amount).toBe(-75);
    expect(goalProgress(books.goals[0], books, rates).barPercent).toBe(0);

    const frozenRates = usdBook('2026-12-20');
    const beforeLater = goalProgress(books.goals[0], books, frozenRates).current.amount;
    books = createCapitalMovement(books, {
      accountId: accountId(books, 'Депозит'),
      kind: 'deposit',
      amount: 999,
      date: '2026-12-05',
      source: 'cash',
      idempotencyKey: 'later',
    }).books;
    expect(goalProgress(books.goals[0], books, frozenRates).current.amount).toBe(beforeLater);
    expect(goalProgress(books.goals[0], books, frozenRates).frozen).toBe(true);

    books = updateCapitalMovement(books, deposit.value.id, {
      accountId: accountId(books, 'Депозит'),
      kind: 'deposit',
      amount: 80,
      date: '2026-11-10',
      source: 'gift',
      idempotencyKey: 'g',
    }).books;
    expect(goalProgress(books.goals[0], books, frozenRates).current.amount).toBe(-120);
  });

  it('keeps months without operations and refuses to archive a non-zero capital account', () => {
    let books = createAccount(emptyBooks(), {
      name: 'Депозит',
      currency: 'USD',
      initialBalance: 500,
      purpose: 'CAPITAL',
      date: '2026-10-01',
    }).books;
    const analytics = buildCapitalAnalytics(books, 'USD', usdBook('2026-12-15'), 'all');
    const november = analytics.months.find((row) => row.month === '2026-11');
    expect(november?.contributed.amount).toBe(0);
    expect(november?.opening.amount).toBe(500);
    expect(november?.closing.amount).toBe(500);
    expect(analytics.months[0].changePercent).toBeNull();

    expect(() => archiveAccount(books, accountId(books, 'Депозит'))).toThrowError(
      expect.objectContaining({ code: 'ARCHIVE_NONZERO' })
    );
    expect(() => deleteAccount(books, accountId(books, 'Депозит'))).toThrowError(
      expect.objectContaining({ code: 'ARCHIVE_REQUIRED' })
    );

    books = createCapitalMovement(books, {
      accountId: accountId(books, 'Депозит'),
      kind: 'withdrawal',
      amount: 500,
      date: '2026-12-01',
      idempotencyKey: 'empty',
    }).books;
    books = archiveAccount(books, accountId(books, 'Депозит')).books;
    expect(books.accounts[0].archivedAt).toBeTruthy();
    expect(books.transactions.length).toBeGreaterThan(0);
    expect(buildCapitalAnalytics(books, 'USD', usdBook('2026-12-15'), 'all').history.length).toBeGreaterThan(0);
  });

  it('reassigns the default account and restores local state after reload', () => {
    let books = createAccount(emptyBooks(), {
      name: 'Карта',
      currency: 'USD',
      initialBalance: 10,
      purpose: 'REGULAR',
      date: '2026-01-01',
    }).books;
    books = createAccount(books, {
      name: 'Наличные',
      currency: 'BYN',
      initialBalance: 5,
      purpose: 'REGULAR',
      date: '2026-01-02',
    }).books;
    books = setAccountPurpose(books, accountId(books, 'Карта'), 'CAPITAL', '2026-02-01').books;
    expect(books.accounts.find((account) => account.name === 'Карта')?.isDefault).toBe(false);
    expect(books.accounts.find((account) => account.name === 'Наличные')?.isDefault).toBe(true);

    const persisted = normalizePersistedFinanceState({
      financeAccounts: books.accounts,
      financeTransactions: books.transactions,
      financeTransfers: books.transfers,
      financePurposeChanges: books.purposeChanges,
      financeCapitalGoals: books.goals,
    });
    const reloaded = rebalance({
      accounts: persisted.financeAccounts,
      transactions: persisted.financeTransactions,
      transfers: persisted.financeTransfers,
      purposeChanges: persisted.financePurposeChanges,
      goals: persisted.financeCapitalGoals,
    });
    expect(reloaded.accounts.find((account) => account.name === 'Наличные')?.isDefault).toBe(true);
    expect(reloaded.accounts.find((account) => account.name === 'Карта')?.balance).toBe(10);
  });

  it('suggests goal boundaries for a five-year target', () => {
    expect(suggestGoalDates('five_years', '2026-11-25')).toEqual({
      startDate: '2026-11-25',
      endDate: '2031-11-24',
    });
    expect(suggestGoalDates('month', '2026-11-25').startDate).toBe('2026-11-01');
  });
});

function emptyBooks(): FinanceBooks {
  return { accounts: [], transactions: [], transfers: [], purposeChanges: [], goals: [] };
}

function seedControl(): FinanceBooks {
  let books = createAccount(emptyBooks(), {
    name: 'Карта',
    currency: 'USD',
    initialBalance: 2000,
    purpose: 'REGULAR',
    date: '2026-10-01',
  }).books;
  books = createAccount(books, {
    name: 'Депозит',
    currency: 'USD',
    initialBalance: 1000,
    purpose: 'CAPITAL',
    date: '2026-10-01',
  }).books;
  return books;
}

function balance(books: FinanceBooks, name: string): number {
  return books.accounts.find((account) => account.name === name)?.balance ?? Number.NaN;
}

function transferInput(
  books: FinanceBooks,
  from: string,
  to: string,
  amount: number,
  date: string,
  key: string
): TransferInput {
  return {
    fromAccountId: accountId(books, from),
    toAccountId: accountId(books, to),
    debitAmount: amount,
    creditAmount: amount,
    date,
    idempotencyKey: key,
  };
}

function createSerialQueue() {
  let tail = Promise.resolve();
  return function exclusive<T>(task: () => T): Promise<T> {
    const run = tail.then(() => task());
    tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}
