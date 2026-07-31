import type { FinanceCurrency } from '@/entities/finance/model/types';

export interface NbrbRateRow {
  Cur_Abbreviation: string;
  Cur_Scale: number;
  Cur_OfficialRate: number;
  Date: string;
}

export interface ExchangeRate {
  currency: FinanceCurrency;
  scale: number;
  rate: number;
  date: string;
}

export type ExchangeRatesMap = Record<FinanceCurrency, ExchangeRate>;

const SUPPORTED_CURRENCIES: FinanceCurrency[] = ['BYN', 'USD', 'RUB', 'CNY'];

const NBRB_RATES_URL = 'https://www.nbrb.by/api/exrates/rates?periodicity=0';

let cachedRates: ExchangeRatesMap | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

function buildRatesMap(rows: NbrbRateRow[]): ExchangeRatesMap {
  const byAbbreviation = new Map(rows.map((row) => [row.Cur_Abbreviation, row]));
  const today = rows[0]?.Date ?? new Date().toISOString();

  const rates = {} as ExchangeRatesMap;

  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency === 'BYN') {
      rates.BYN = { currency: 'BYN', scale: 1, rate: 1, date: today };
      continue;
    }

    const row = byAbbreviation.get(currency);
    if (!row) {
      throw new Error(`NBRB rate not found for ${currency}`);
    }

    rates[currency] = {
      currency,
      scale: row.Cur_Scale,
      rate: row.Cur_OfficialRate,
      date: row.Date,
    };
  }

  return rates;
}

export async function fetchNbrbExchangeRates(): Promise<ExchangeRatesMap> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
    return cachedRates;
  }

  const response = await fetch(NBRB_RATES_URL, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch NBRB exchange rates');
  }

  const rows = (await response.json()) as NbrbRateRow[];
  cachedRates = buildRatesMap(rows);
  cachedAt = now;

  return cachedRates;
}

export function getSupportedDisplayCurrencies(): FinanceCurrency[] {
  return SUPPORTED_CURRENCIES;
}
