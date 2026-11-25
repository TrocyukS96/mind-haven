import type {
  CapitalRange,
  FinanceAccount,
  FinanceBooks,
  FinanceCurrency,
  FinanceTransaction,
  FinanceTransfer,
} from '@/entities/finance/model/types';
import { balanceAt, purposeAt } from './capital-ledger';
import { decCmp, money } from './decimal';
import {
  addValued,
  changePercent,
  convertAmount,
  zeroValued,
  type RateBook,
  type ValuedAmount,
} from './historical-rates';

export interface SavingsFlow {
  id: string;
  date: string;
  accountId: string;
  currency: FinanceCurrency;
  kind: 'contribution' | 'withdrawal' | 'yield' | 'fee' | 'adjustment' | 'composition';
  /** Positive magnitude in the account currency. */
  amount: number;
  sign: 1 | -1;
  comment: string;
}

export interface CapitalMonthRow {
  month: string;
  opening: ValuedAmount;
  contributed: ValuedAmount;
  withdrawn: ValuedAmount;
  netSavings: ValuedAmount;
  yield: ValuedAmount;
  revaluation: ValuedAmount;
  other: ValuedAmount;
  closing: ValuedAmount;
  changePercent: number | null;
  isCurrent: boolean;
  approximate: boolean;
}

export interface CapitalSeriesPoint {
  date: string;
  total: ValuedAmount;
  delta: ValuedAmount;
  contributed: ValuedAmount;
  withdrawn: ValuedAmount;
}

export interface CapitalHistoryRow {
  id: string;
  date: string;
  kind:
    | 'deposit'
    | 'withdrawal'
    | 'purchase'
    | 'contribution_transfer'
    | 'withdrawal_transfer'
    | 'internal_transfer'
    | 'neutral_transfer'
    | 'interest'
    | 'investment_income'
    | 'revaluation'
    | 'adjustment'
    | 'composition';
  accountId: string;
  counterpartyAccountId: string | null;
  amount: number;
  currency: FinanceCurrency;
  counterAmount: number | null;
  counterCurrency: FinanceCurrency | null;
  feeAmount: number | null;
  displayAmount: ValuedAmount;
  comment: string;
  transferId: string | null;
  transactionId: string | null;
  createdAt: string;
}

export interface CapitalMotivation {
  positiveStreak: number;
  bestMonth: { month: string; net: number } | null;
  maxCapital: ValuedAmount;
  averageLast3: ValuedAmount;
}

export interface CapitalAnalytics {
  hasCapital: boolean;
  firstDate: string | null;
  total: ValuedAmount;
  monthOpening: ValuedAmount;
  monthChange: ValuedAmount;
  monthNet: ValuedAmount;
  monthChangePercent: number | null;
  months: CapitalMonthRow[];
  series: CapitalSeriesPoint[];
  history: CapitalHistoryRow[];
  motivation: CapitalMotivation;
  accountMonthChange: Record<string, ValuedAmount>;
}

function signed(flow: SavingsFlow): number {
  return flow.sign * flow.amount;
}

export function listCapitalFlows(books: FinanceBooks): SavingsFlow[] {
  const flows: SavingsFlow[] = [];

  for (const transaction of books.transactions) {
    if (!transaction.capitalFlow || transaction.capitalFlow === 'internal') continue;
    if (transaction.capitalFlow === 'revaluation') continue;
    const account = books.accounts.find((item) => item.id === transaction.accountId);
    if (!account) continue;

    if (transaction.capitalFlow === 'fee') {
      if (purposeAt(account, books.purposeChanges, transaction.date) !== 'CAPITAL') continue;
    }

    const kind = transaction.capitalFlow;
    if (
      kind !== 'contribution' &&
      kind !== 'withdrawal' &&
      kind !== 'yield' &&
      kind !== 'fee' &&
      kind !== 'adjustment'
    ) {
      continue;
    }

    const sign: 1 | -1 =
      kind === 'withdrawal' || kind === 'fee'
        ? -1
        : kind === 'adjustment'
          ? transaction.type === 'capital_out'
            ? -1
            : 1
          : 1;

    flows.push({
      id: transaction.id,
      date: transaction.date,
      accountId: account.id,
      currency: account.currency,
      kind,
      amount: transaction.amount,
      sign,
      comment: transaction.description,
    });
  }

  for (const change of books.purposeChanges) {
    const account = books.accounts.find((item) => item.id === change.accountId);
    if (!account) continue;
    const enters = change.toPurpose === 'CAPITAL';
    const leaves =
      change.toPurpose === 'REGULAR' && (change.fromPurpose === 'CAPITAL' || change.fromPurpose === null);
    if (!enters && !leaves) continue;
    const delta = compositionDelta(account, books, change.effectiveDate, enters, flows);
    if (!delta) continue;
    flows.push({
      id: change.id,
      date: change.effectiveDate,
      accountId: account.id,
      currency: account.currency,
      kind: 'composition',
      amount: delta.amount,
      sign: delta.sign,
      comment: '',
    });
  }

  return flows.sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0));
}

export function capitalValueAt(
  books: FinanceBooks,
  date: string,
  displayCurrency: FinanceCurrency,
  book: RateBook
): ValuedAmount {
  let total = zeroValued();
  let sawAccount = false;

  for (const account of books.accounts) {
    if (purposeAt(account, books.purposeChanges, date) !== 'CAPITAL') continue;
    sawAccount = true;
    const balance = Number(balanceAt(account, books.transactions, date));
    const converted = convertAmount(balance, account.currency, displayCurrency, date, book);
    total = addValued(total, converted);
  }

  if (!sawAccount) return zeroValued();
  return total;
}

function hasCapital(books: FinanceBooks): boolean {
  return (
    books.accounts.some((account) => account.purpose === 'CAPITAL') ||
    books.purposeChanges.some((change) => change.toPurpose === 'CAPITAL')
  );
}

function firstCapitalDate(books: FinanceBooks): string | null {
  const dates = books.purposeChanges
    .filter((change) => change.toPurpose === 'CAPITAL')
    .map((change) => change.effectiveDate);
  if (dates.length === 0) {
    const created = books.accounts
      .filter((account) => account.purpose === 'CAPITAL' && account.createdAt)
      .map((account) => account.createdAt!.slice(0, 10));
    if (created.length === 0) return null;
    return created.sort()[0];
  }
  return dates.sort()[0];
}

function monthEnd(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber, 0));
  return date.toISOString().slice(0, 10);
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

function previousDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function sumFlows(
  flows: SavingsFlow[],
  kinds: SavingsFlow['kind'][],
  displayCurrency: FinanceCurrency,
  book: RateBook,
  signMode: 'signed' | 'positive'
): ValuedAmount {
  let total = zeroValued();
  for (const flow of flows) {
    if (!kinds.includes(flow.kind)) continue;
    const converted = convertAmount(flow.amount, flow.currency, displayCurrency, flow.date, book);
    if (converted.amount == null) {
      total = addValued(total, converted);
      continue;
    }
    const signedAmount =
      signMode === 'positive' ? Math.abs(converted.amount) : converted.amount * flow.sign;
    total = addValued(total, { ...converted, amount: signedAmount });
  }
  return total;
}

function sameDayExplained(flows: SavingsFlow[], accountId: string, date: string): number {
  return flows.reduce((sum, flow) => {
    if (flow.accountId !== accountId || flow.date !== date || flow.kind === 'composition') return sum;
    return sum + flow.sign * flow.amount;
  }, 0);
}

/** Balance that entered or left capital, excluding flows already counted on that date. */
function compositionDelta(
  account: FinanceAccount,
  books: FinanceBooks,
  date: string,
  enters: boolean,
  flows: SavingsFlow[]
): { amount: number; sign: 1 | -1 } | null {
  const balance = Number(balanceAt(account, books.transactions, date));
  const residual = Number(money(balance - sameDayExplained(flows, account.id, date)));
  if (decCmp(money(residual), '0.00') === 0) return null;
  const positive = residual > 0;
  return {
    amount: Math.abs(residual),
    sign: enters ? (positive ? 1 : -1) : positive ? -1 : 1,
  };
}

function flowsBetween(flows: SavingsFlow[], start: string, end: string): SavingsFlow[] {
  return flows.filter((flow) => flow.date >= start && flow.date <= end);
}

function buildMonthRow(
  books: FinanceBooks,
  flows: SavingsFlow[],
  month: string,
  today: string,
  displayCurrency: FinanceCurrency,
  book: RateBook
): CapitalMonthRow {
  const start = `${month}-01`;
  const end = monthEnd(month);
  const closingDate = end > today ? today : end;
  const openingDate = previousDay(start);
  const monthFlows = flowsBetween(flows, start, closingDate);
  const opening = capitalValueAt(books, openingDate, displayCurrency, book);
  const closing = capitalValueAt(books, closingDate, displayCurrency, book);
  const contributed = sumFlows(monthFlows, ['contribution'], displayCurrency, book, 'positive');
  const withdrawn = sumFlows(monthFlows, ['withdrawal'], displayCurrency, book, 'positive');
  const yieldAmount = sumFlows(monthFlows, ['yield'], displayCurrency, book, 'signed');
  const other = sumFlows(monthFlows, ['fee', 'adjustment', 'composition'], displayCurrency, book, 'signed');
  const netSavings =
    contributed.amount == null || withdrawn.amount == null
      ? { amount: null, approximate: contributed.approximate || withdrawn.approximate, rateDate: null }
      : {
          amount: Number(money(contributed.amount - withdrawn.amount)),
          approximate: contributed.approximate || withdrawn.approximate,
          rateDate: contributed.rateDate ?? withdrawn.rateDate,
        };

  let revaluation: ValuedAmount = { amount: null, approximate: false, rateDate: null };
  if (
    opening.amount != null &&
    closing.amount != null &&
    netSavings.amount != null &&
    yieldAmount.amount != null &&
    other.amount != null
  ) {
    const explained = netSavings.amount + yieldAmount.amount + other.amount;
    revaluation = {
      amount: Number(money(closing.amount - opening.amount - explained)),
      approximate:
        opening.approximate ||
        closing.approximate ||
        netSavings.approximate ||
        yieldAmount.approximate ||
        other.approximate,
      rateDate: opening.rateDate,
    };
  }

  return {
    month,
    opening,
    contributed,
    withdrawn,
    netSavings,
    yield: yieldAmount,
    revaluation,
    other,
    closing,
    changePercent: changePercent(opening.amount, closing.amount),
    isCurrent: month === today.slice(0, 7),
    approximate:
      opening.approximate ||
      closing.approximate ||
      netSavings.approximate ||
      yieldAmount.approximate ||
      other.approximate,
  };
}

function buildMonths(
  books: FinanceBooks,
  flows: SavingsFlow[],
  today: string,
  displayCurrency: FinanceCurrency,
  book: RateBook,
  firstDate: string | null
): CapitalMonthRow[] {
  if (!firstDate) return [];
  const startMonth = firstDate.slice(0, 7);
  const endMonth = today.slice(0, 7);
  const rows: CapitalMonthRow[] = [];
  let cursor = startMonth;
  while (cursor <= endMonth) {
    rows.push(buildMonthRow(books, flows, cursor, today, displayCurrency, book));
    cursor = shiftMonth(cursor, 1);
  }
  return rows;
}

export function seriesStart(range: CapitalRange, today: string, firstDate: string | null): string {
  const month = today.slice(0, 7);
  if (range === 'month') return `${month}-01`;
  if (range === '3m') return `${shiftMonth(month, -2)}-01`;
  if (range === '6m') return `${shiftMonth(month, -5)}-01`;
  if (range === 'year') return `${shiftMonth(month, -11)}-01`;
  return firstDate ?? today;
}

export function seriesUsesDaily(range: CapitalRange): boolean {
  return range === 'month' || range === '3m';
}

function buildSeries(
  books: FinanceBooks,
  flows: SavingsFlow[],
  range: CapitalRange,
  today: string,
  displayCurrency: FinanceCurrency,
  book: RateBook,
  firstDate: string | null
): CapitalSeriesPoint[] {
  const start = seriesStart(range, today, firstDate);
  const boundedStart = firstDate && start < firstDate ? firstDate : start;
  const points: CapitalSeriesPoint[] = [];

  const pushPoint = (date: string, previousDate: string | null) => {
    const total = capitalValueAt(books, date, displayCurrency, book);
    const previous = previousDate
      ? capitalValueAt(books, previousDate, displayCurrency, book)
      : zeroValued();
    const from = previousDate ? addDays(previousDate, 1) : boundedStart;
    const slice = flowsBetween(flows, from, date);
    const contributed = sumFlows(slice, ['contribution'], displayCurrency, book, 'positive');
    const withdrawn = sumFlows(slice, ['withdrawal'], displayCurrency, book, 'positive');
    const delta =
      total.amount == null || previous.amount == null
        ? { amount: null, approximate: false, rateDate: null }
        : {
            amount: Number(money(total.amount - previous.amount)),
            approximate: total.approximate || previous.approximate,
            rateDate: total.rateDate,
          };
    points.push({ date, total, delta, contributed, withdrawn });
  };

  if (seriesUsesDaily(range)) {
    let cursor = boundedStart;
    let previous: string | null = previousDay(boundedStart);
    while (cursor <= today) {
      pushPoint(cursor, previous);
      previous = cursor;
      cursor = addDays(cursor, 1);
    }
    return points;
  }

  let month = boundedStart.slice(0, 7);
  const endMonth = today.slice(0, 7);
  let previous: string | null = previousDay(`${month}-01`);
  while (month <= endMonth) {
    const date = monthEnd(month) > today ? today : monthEnd(month);
    pushPoint(date, previous);
    previous = date;
    month = shiftMonth(month, 1);
  }
  return points;
}

function accountCurrency(books: FinanceBooks, accountId: string): FinanceCurrency {
  return books.accounts.find((account) => account.id === accountId)?.currency ?? 'BYN';
}

function historyFromTransfer(books: FinanceBooks, transfer: FinanceTransfer, book: RateBook, display: FinanceCurrency): CapitalHistoryRow {
  const from = books.accounts.find((account) => account.id === transfer.fromAccountId);
  const to = books.accounts.find((account) => account.id === transfer.toAccountId);
  const fromPurpose = from ? purposeAt(from, books.purposeChanges, transfer.date) : 'REGULAR';
  const toPurpose = to ? purposeAt(to, books.purposeChanges, transfer.date) : 'REGULAR';
  const kind: CapitalHistoryRow['kind'] =
    fromPurpose === 'CAPITAL' && toPurpose === 'CAPITAL'
      ? 'internal_transfer'
      : fromPurpose === 'REGULAR' && toPurpose === 'CAPITAL'
        ? 'contribution_transfer'
        : fromPurpose === 'CAPITAL' && toPurpose === 'REGULAR'
          ? 'withdrawal_transfer'
          : 'neutral_transfer';
  const displaySource = toPurpose === 'CAPITAL' ? to : from;
  const displayValue = toPurpose === 'CAPITAL' ? transfer.creditAmount : transfer.debitAmount;
  return {
    id: transfer.id,
    date: transfer.date,
    kind,
    accountId: transfer.fromAccountId,
    counterpartyAccountId: transfer.toAccountId,
    amount: transfer.debitAmount,
    currency: from?.currency ?? 'BYN',
    counterAmount: transfer.creditAmount,
    counterCurrency: to?.currency ?? null,
    feeAmount: transfer.feeAmount > 0 ? transfer.feeAmount : null,
    displayAmount: displaySource
      ? convertAmount(displayValue, displaySource.currency, display, transfer.date, book)
      : { amount: null, approximate: false, rateDate: null },
    comment: transfer.comment,
    transferId: transfer.id,
    transactionId: null,
    createdAt: transfer.createdAt ?? transfer.date,
  };
}

function historyFromTransaction(
  books: FinanceBooks,
  transaction: FinanceTransaction,
  book: RateBook,
  display: FinanceCurrency
): CapitalHistoryRow | null {
  if (transaction.transferId || !transaction.capitalKind || transaction.capitalKind === 'fee') {
    return null;
  }
  const currency = accountCurrency(books, transaction.accountId);
  const kind: CapitalHistoryRow['kind'] =
    transaction.capitalKind === 'withdrawal' && transaction.expenseCategory
      ? 'purchase'
      : transaction.capitalKind === 'deposit'
        ? 'deposit'
        : transaction.capitalKind === 'withdrawal'
          ? 'withdrawal'
          : transaction.capitalKind === 'interest'
            ? 'interest'
            : transaction.capitalKind === 'investment_income'
              ? 'investment_income'
              : transaction.capitalKind === 'revaluation'
                ? 'revaluation'
                : 'adjustment';
  const sign = transaction.type === 'capital_out' ? -1 : 1;
  return {
    id: transaction.id,
    date: transaction.date,
    kind,
    accountId: transaction.accountId,
    counterpartyAccountId: null,
    amount: sign * transaction.amount,
    currency,
    counterAmount: null,
    counterCurrency: null,
    feeAmount: null,
    displayAmount: convertAmount(sign * transaction.amount, currency, display, transaction.date, book),
    comment: transaction.description,
    transferId: null,
    transactionId: transaction.id,
    createdAt: transaction.createdAt ?? transaction.date,
  };
}

export function buildCapitalHistory(
  books: FinanceBooks,
  displayCurrency: FinanceCurrency,
  book: RateBook
): CapitalHistoryRow[] {
  const rows: CapitalHistoryRow[] = [
    ...books.transfers
      .filter((transfer) => {
        const from = books.accounts.find((account) => account.id === transfer.fromAccountId);
        const to = books.accounts.find((account) => account.id === transfer.toAccountId);
        if (!from || !to) return false;
        return (
          purposeAt(from, books.purposeChanges, transfer.date) === 'CAPITAL' ||
          purposeAt(to, books.purposeChanges, transfer.date) === 'CAPITAL'
        );
      })
      .map((transfer) => historyFromTransfer(books, transfer, book, displayCurrency)),
    ...books.transactions
      .map((transaction) => historyFromTransaction(books, transaction, book, displayCurrency))
      .filter((row): row is CapitalHistoryRow => row != null),
    ...listCapitalFlows(books)
      .filter((flow) => flow.kind === 'composition')
      .map((flow) => {
        const change = books.purposeChanges.find((item) => item.id === flow.id);
        const signed = flow.sign * flow.amount;
        return {
          id: flow.id,
          date: flow.date,
          kind: 'composition' as const,
          accountId: flow.accountId,
          counterpartyAccountId: null,
          amount: signed,
          currency: flow.currency,
          counterAmount: null,
          counterCurrency: null,
          feeAmount: null,
          displayAmount: convertAmount(signed, flow.currency, displayCurrency, flow.date, book),
          comment: '',
          transferId: null,
          transactionId: null,
          createdAt: change?.createdAt ?? flow.date,
        };
      }),
  ];

  return rows.sort((left, right) => {
    if (left.date !== right.date) return left.date < right.date ? 1 : -1;
    return left.createdAt < right.createdAt ? 1 : -1;
  });
}

function motivationFrom(months: CapitalMonthRow[], samples: ValuedAmount[]): CapitalMotivation {
  const completed = months.filter((row) => !row.isCurrent && row.netSavings.amount != null);
  let streak = 0;
  for (let index = completed.length - 1; index >= 0; index -= 1) {
    if ((completed[index].netSavings.amount ?? 0) > 0) streak += 1;
    else break;
  }

  const ranked = months.filter((row) => row.netSavings.amount != null);
  const best = ranked.reduce<{ month: string; net: number } | null>((winner, row) => {
    const net = row.netSavings.amount ?? 0;
    if (!winner || net > winner.net) return { month: row.month, net };
    return winner;
  }, null);

  const last3 = completed.slice(-3).filter((row) => row.netSavings.amount != null);
  let averageLast3: ValuedAmount = { amount: null, approximate: false, rateDate: null };
  if (last3.length > 0) {
    const sum = last3.reduce((total, row) => total + (row.netSavings.amount ?? 0), 0);
    averageLast3 = {
      amount: Number(money(sum / last3.length)),
      approximate: last3.some((row) => row.netSavings.approximate),
      rateDate: null,
    };
  }

  const valued = samples.filter((sample) => sample.amount != null);
  const maxCapital = valued.reduce<ValuedAmount>(
    (max, sample) => ((sample.amount ?? 0) > (max.amount ?? Number.NEGATIVE_INFINITY) ? sample : max),
    { amount: null, approximate: false, rateDate: null }
  );

  return { positiveStreak: streak, bestMonth: best, maxCapital, averageLast3 };
}

export function buildCapitalAnalytics(
  books: FinanceBooks,
  displayCurrency: FinanceCurrency,
  book: RateBook,
  range: CapitalRange = 'year'
): CapitalAnalytics {
  const today = book.today;
  const capital = hasCapital(books);
  const firstDate = capital ? firstCapitalDate(books) : null;
  const flows = listCapitalFlows(books);
  const months = buildMonths(books, flows, today, displayCurrency, book, firstDate);
  const current = months.find((row) => row.isCurrent);
  const total = capitalValueAt(books, today, displayCurrency, book);
  const series = capital
    ? buildSeries(books, flows, range, today, displayCurrency, book, firstDate)
    : [];
  const monthEndSamples = months.map((row) => row.closing);
  const accountMonthChange: Record<string, ValuedAmount> = {};
  const monthStart = previousDay(`${today.slice(0, 7)}-01`);

  for (const account of books.accounts) {
    if (account.purpose !== 'CAPITAL' || account.archivedAt) continue;
    const now = convertAmount(
      Number(balanceAt(account, books.transactions, today)),
      account.currency,
      displayCurrency,
      today,
      book
    );
    const thenBalance =
      purposeAt(account, books.purposeChanges, monthStart) === 'CAPITAL'
        ? Number(balanceAt(account, books.transactions, monthStart))
        : 0;
    const then = convertAmount(thenBalance, account.currency, displayCurrency, monthStart, book);
    accountMonthChange[account.id] =
      now.amount == null || then.amount == null
        ? { amount: null, approximate: false, rateDate: null }
        : {
            amount: Number(money(now.amount - then.amount)),
            approximate: now.approximate || then.approximate,
            rateDate: now.rateDate,
          };
  }

  return {
    hasCapital: capital,
    firstDate,
    total,
    monthOpening: current?.opening ?? zeroValued(),
    monthChange:
      current?.opening.amount == null || current?.closing.amount == null
        ? { amount: null, approximate: false, rateDate: null }
        : {
            amount: Number(money(current.closing.amount - current.opening.amount)),
            approximate: current.opening.approximate || current.closing.approximate,
            rateDate: current.closing.rateDate,
          },
    monthNet: current?.netSavings ?? zeroValued(),
    monthChangePercent: current?.changePercent ?? null,
    months,
    series,
    history: buildCapitalHistory(books, displayCurrency, book),
    motivation: motivationFrom(months, [...monthEndSamples, total]),
    accountMonthChange,
  };
}

export function accountBalanceOn(
  account: FinanceAccount,
  books: FinanceBooks,
  date: string
): number {
  return Number(balanceAt(account, books.transactions, date));
}
