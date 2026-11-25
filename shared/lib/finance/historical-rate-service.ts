import { prisma } from '@/shared/lib/db';
import { decDiv } from './decimal';
import type { HistoricalRateSeries, RateQuote } from './historical-rates';

interface NbrbCurrencyRow {
  Cur_ID: number;
  Cur_Abbreviation: string;
  Cur_Scale: number;
}

interface NbrbDynamicRow {
  Date: string;
  Cur_OfficialRate: number;
}

const TRACKED = ['USD', 'RUB', 'CNY'] as const;
type TrackedCurrency = (typeof TRACKED)[number];

function isTrackedCurrency(value: string): value is TrackedCurrency {
  return (TRACKED as readonly string[]).includes(value);
}
const NBRB_CURRENT = 'https://www.nbrb.by/api/exrates/rates?periodicity=0';
const memoryCache = new Map<string, { at: number; series: HistoricalRateSeries }>();
const MEMORY_TTL_MS = 60 * 60 * 1000;

function isoDate(value: string): string {
  return value.slice(0, 10);
}

function shiftDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`NBRB ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadCurrencyMeta(): Promise<Array<{ currency: TrackedCurrency; id: number; scale: number }>> {
  const rows = await fetchJson<NbrbCurrencyRow[]>(NBRB_CURRENT);
  return TRACKED.map((currency) => {
    const row = rows.find((item) => item.Cur_Abbreviation === currency);
    if (!row) throw new Error(`NBRB currency ${currency} was not found`);
    return { currency, id: row.Cur_ID, scale: row.Cur_Scale };
  });
}

function quotesFromDynamics(rows: NbrbDynamicRow[], scale: number): RateQuote[] {
  return rows.map((row) => ({
    date: isoDate(row.Date),
    bynPerUnit: decDiv(String(row.Cur_OfficialRate), String(scale)),
  }));
}

export async function getHistoricalRateSeries(from: string, to: string): Promise<HistoricalRateSeries> {
  const start = shiftDays(from, -21);
  const cacheKey = `${start}:${to}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MEMORY_TTL_MS) {
    return cached.series;
  }

  const series: HistoricalRateSeries = { quotes: {} };
  let metas: Array<{ currency: TrackedCurrency; id: number; scale: number }> = [];

  try {
    const stored = await prisma.exchangeRateHistory.findMany({
      where: {
        currency: { in: [...TRACKED] },
        rateDate: { gte: new Date(`${start}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) },
      },
      orderBy: { rateDate: 'asc' },
    });
    for (const row of stored) {
      if (!isTrackedCurrency(row.currency)) continue;
      const currency = row.currency;
      const list = series.quotes[currency] ?? [];
      list.push({
        date: row.rateDate.toISOString().slice(0, 10),
        bynPerUnit: decDiv(row.rate.toString(), String(row.scale)),
      });
      series.quotes[currency] = list;
    }
  } catch {
    // The cache table may not exist until the migration is applied.
  }

  const needsFetch = TRACKED.some((currency) => {
    const quotes = series.quotes[currency] ?? [];
    if (quotes.length === 0) return true;
    const latest = quotes[quotes.length - 1]?.date ?? '';
    return latest < shiftDays(to, -4);
  });

  if (needsFetch) {
    metas = await loadCurrencyMeta();
    await Promise.all(
      metas.map(async (meta) => {
        const url = `https://www.nbrb.by/api/exrates/rates/dynamics/${meta.id}?startdate=${start}&enddate=${to}`;
        const rows = await fetchJson<NbrbDynamicRow[]>(url);
        const quotes = quotesFromDynamics(rows, meta.scale);
        series.quotes[meta.currency] = quotes;
        try {
          for (const row of rows) {
            const rateDate = new Date(`${isoDate(row.Date)}T00:00:00.000Z`);
            await prisma.exchangeRateHistory.upsert({
              where: { rateDate_currency: { rateDate, currency: meta.currency } },
              create: {
                rateDate,
                currency: meta.currency,
                scale: meta.scale,
                rate: row.Cur_OfficialRate,
                source: 'nbrb',
              },
              update: {
                scale: meta.scale,
                rate: row.Cur_OfficialRate,
                source: 'nbrb',
              },
            });
          }
        } catch {
          // Serving the fetched quotes still works when the database cache is unavailable.
        }
      })
    );
  }

  memoryCache.set(cacheKey, { at: Date.now(), series });
  return series;
}
