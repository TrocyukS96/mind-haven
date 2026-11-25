import type { FinanceCurrency } from '@/entities/finance/model/types';
import type { ExchangeRatesMap } from '@/shared/lib/finance/nbrb-exchange-service';
import { decCmp, decDiv, decMul, money } from './decimal';

export interface RateQuote {
  date: string;
  bynPerUnit: string;
}

export interface HistoricalRateSeries {
  quotes: Partial<Record<Exclude<FinanceCurrency, 'BYN'>, RateQuote[]>>;
}

export interface RateBook {
  series: HistoricalRateSeries;
  current: ExchangeRatesMap | null;
  today: string;
}

export interface ValuedAmount {
  amount: number | null;
  approximate: boolean;
  rateDate: string | null;
}

interface ResolvedRate {
  bynPerUnit: string;
  rateDate: string;
  approximate: boolean;
}

export function emptyRateSeries(): HistoricalRateSeries {
  return { quotes: {} };
}

export function resolveBynPerUnit(
  currency: FinanceCurrency,
  date: string,
  book: RateBook
): ResolvedRate | null {
  if (currency === 'BYN') {
    return { bynPerUnit: '1.00000000', rateDate: date, approximate: false };
  }

  const quotes = [...(book.series.quotes[currency] ?? [])].sort((left, right) =>
    left.date < right.date ? -1 : left.date > right.date ? 1 : 0
  );
  const exact = [...quotes].reverse().find((quote) => quote.date === date);
  if (exact) {
    return { bynPerUnit: exact.bynPerUnit, rateDate: exact.date, approximate: false };
  }

  if (date === book.today && book.current) {
    const entry = book.current[currency];
    if (entry?.rate && entry.scale) {
      return {
        bynPerUnit: decDiv(String(entry.rate), String(entry.scale)),
        rateDate: entry.date.slice(0, 10),
        approximate: false,
      };
    }
  }

  const previous = [...quotes].reverse().find((quote) => quote.date < date);
  if (!previous) return null;

  return {
    bynPerUnit: previous.bynPerUnit,
    rateDate: previous.date,
    approximate: true,
  };
}

export function convertAmount(
  amount: number | string,
  from: FinanceCurrency,
  to: FinanceCurrency,
  date: string,
  book: RateBook
): ValuedAmount {
  if (from === to) {
    return { amount: Number(money(amount)), approximate: false, rateDate: date };
  }

  const fromRate = resolveBynPerUnit(from, date, book);
  const toRate = resolveBynPerUnit(to, date, book);
  if (!fromRate || !toRate) {
    return { amount: null, approximate: false, rateDate: null };
  }

  const converted = decDiv(decMul(money(amount), fromRate.bynPerUnit), toRate.bynPerUnit);
  const approximate = fromRate.approximate || toRate.approximate;
  const rateDate = [fromRate, toRate]
    .filter((rate) => rate.approximate || from !== 'BYN')
    .map((rate) => rate.rateDate)
    .sort()[0] ?? date;

  return {
    amount: Number(money(converted)),
    approximate,
    rateDate: approximate ? rateDate : date,
  };
}

export function addValued(left: ValuedAmount, right: ValuedAmount, sign = 1): ValuedAmount {
  if (left.amount == null || right.amount == null) {
    return { amount: null, approximate: left.approximate || right.approximate, rateDate: null };
  }

  const next = sign < 0 ? left.amount - right.amount : left.amount + right.amount;
  return {
    amount: Number(money(next)),
    approximate: left.approximate || right.approximate,
    rateDate: left.rateDate && right.rateDate && left.rateDate < right.rateDate ? left.rateDate : right.rateDate,
  };
}

export function zeroValued(): ValuedAmount {
  return { amount: 0, approximate: false, rateDate: null };
}

export function isMissing(value: ValuedAmount): boolean {
  return value.amount == null;
}

export function changePercent(opening: number | null, closing: number | null): number | null {
  if (opening == null || closing == null) return null;
  if (decCmp(money(opening), '0.00') === 0) return null;
  return ((closing - opening) / opening) * 100;
}
