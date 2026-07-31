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

interface ErApiResponse {
  result: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
}

export interface ExchangeRatesPayload {
  rates: ExchangeRatesMap;
  source: 'nbrb' | 'er-api';
}

const SUPPORTED_CURRENCIES: FinanceCurrency[] = ['BYN', 'USD', 'RUB', 'CNY'];

const NBRB_RATES_URL = 'https://www.nbrb.by/api/exrates/rates?periodicity=0';
const ER_API_RATES_URL = 'https://open.er-api.com/v6/latest/USD';

const FETCH_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedPayload: ExchangeRatesPayload | null = null;
let cachedAt = 0;

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildRatesMapFromNbrb(rows: NbrbRateRow[]): ExchangeRatesMap {
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

export function buildRatesMapFromErApi(payload: ErApiResponse): ExchangeRatesMap {
  const bynPerUsd = payload.rates.BYN;
  const rubPerUsd = payload.rates.RUB;
  const cnyPerUsd = payload.rates.CNY;

  if (!bynPerUsd || !rubPerUsd || !cnyPerUsd) {
    throw new Error('Fallback exchange rates are missing required currencies');
  }

  const date = new Date(payload.time_last_update_utc).toISOString();

  return {
    BYN: { currency: 'BYN', scale: 1, rate: 1, date },
    USD: { currency: 'USD', scale: 1, rate: bynPerUsd, date },
    RUB: { currency: 'RUB', scale: 1, rate: bynPerUsd / rubPerUsd, date },
    CNY: { currency: 'CNY', scale: 1, rate: bynPerUsd / cnyPerUsd, date },
  };
}

async function fetchNbrbExchangeRates(): Promise<ExchangeRatesMap> {
  const response = await fetchWithTimeout(NBRB_RATES_URL);

  if (!response.ok) {
    throw new Error('Failed to fetch NBRB exchange rates');
  }

  const rows = (await response.json()) as NbrbRateRow[];
  return buildRatesMapFromNbrb(rows);
}

async function fetchErApiExchangeRates(): Promise<ExchangeRatesMap> {
  const response = await fetchWithTimeout(ER_API_RATES_URL);

  if (!response.ok) {
    throw new Error('Failed to fetch fallback exchange rates');
  }

  const payload = (await response.json()) as ErApiResponse;

  if (payload.result !== 'success') {
    throw new Error('Fallback exchange rates provider returned an error');
  }

  return buildRatesMapFromErApi(payload);
}

export async function fetchExchangeRates(): Promise<ExchangeRatesPayload> {
  const now = Date.now();
  if (cachedPayload && now - cachedAt < CACHE_TTL_MS) {
    return cachedPayload;
  }

  let lastError: unknown;

  try {
    const rates = await fetchNbrbExchangeRates();
    cachedPayload = { rates, source: 'nbrb' };
    cachedAt = now;
    return cachedPayload;
  } catch (error) {
    lastError = error;
  }

  try {
    const rates = await fetchErApiExchangeRates();
    cachedPayload = { rates, source: 'er-api' };
    cachedAt = now;
    return cachedPayload;
  } catch (fallbackError) {
    const primaryMessage =
      lastError instanceof Error ? lastError.message : 'Failed to load NBRB exchange rates';
    const fallbackMessage =
      fallbackError instanceof Error
        ? fallbackError.message
        : 'Failed to load fallback exchange rates';

    throw new Error(`${primaryMessage}; ${fallbackMessage}`);
  }
}

export function getSupportedDisplayCurrencies(): FinanceCurrency[] {
  return SUPPORTED_CURRENCIES;
}
