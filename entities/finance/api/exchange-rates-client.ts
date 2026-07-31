import type { FinanceCurrency } from '@/entities/finance/model/types';
import type { ExchangeRatesMap } from '@/shared/lib/finance/nbrb-exchange-service';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }

  return payload;
}

export async function fetchExchangeRates(): Promise<{
  rates: ExchangeRatesMap;
  source: string;
}> {
  const response = await fetch('/api/finance/exchange-rates');
  return parseResponse<{ rates: ExchangeRatesMap; source: string }>(response);
}

export function getRatesDate(rates: ExchangeRatesMap): string {
  return rates.BYN?.date ?? rates.USD?.date ?? new Date().toISOString();
}

export function getRateLabel(
  currency: FinanceCurrency,
  rates: ExchangeRatesMap,
  target: FinanceCurrency = 'BYN'
): string | null {
  if (currency === target) return null;

  const entry = rates[currency];
  if (!entry) return null;

  if (target === 'BYN') {
    return `${entry.rate} Br за ${entry.scale} ${currency}`;
  }

  return null;
}
