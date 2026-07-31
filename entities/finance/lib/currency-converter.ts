import type { FinanceCurrency } from '@/entities/finance/model/types';
import type { ExchangeRatesMap } from '@/shared/lib/finance/nbrb-exchange-service';
import { FINANCE_CURRENCIES } from '@/entities/finance/model/categories';

/** BYN per 1 unit of the given currency (NBRB official rate). */
export function getBynPerUnit(
  currency: FinanceCurrency,
  rates: ExchangeRatesMap
): number {
  if (currency === 'BYN') return 1;
  const entry = rates[currency];
  return entry.rate / entry.scale;
}

export function convertCurrency(
  amount: number,
  from: FinanceCurrency,
  to: FinanceCurrency,
  rates: ExchangeRatesMap
): number {
  if (from === to) return amount;
  const inByn = amount * getBynPerUnit(from, rates);
  return inByn / getBynPerUnit(to, rates);
}

export function formatConverterValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return '0';

  const abs = Math.abs(value);
  const fractionDigits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;

  return value
    .toFixed(fractionDigits)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '');
}

export function buildConverterAmounts(
  amount: number,
  sourceCurrency: FinanceCurrency,
  rates: ExchangeRatesMap
): Record<FinanceCurrency, string> {
  return FINANCE_CURRENCIES.reduce(
    (acc, currency) => {
      acc[currency] = formatConverterValue(
        convertCurrency(amount, sourceCurrency, currency, rates)
      );
      return acc;
    },
    {} as Record<FinanceCurrency, string>
  );
}

export function parseConverterInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '' || normalized === '.' || normalized === '-') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatFinanceAmount(amount: number, _currency: FinanceCurrency): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
