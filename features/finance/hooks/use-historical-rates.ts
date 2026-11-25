'use client';

import { useEffect, useState } from 'react';
import { fetchHistoricalRates } from '@/entities/finance/api/finance-client';
import type { HistoricalRateSeries } from '@/shared/lib/finance/historical-rates';
import { emptyRateSeries } from '@/shared/lib/finance/historical-rates';

const cache = new Map<string, HistoricalRateSeries>();

interface RateStatus {
  key: string;
  error: string | null;
  series: HistoricalRateSeries | null;
}

export function useHistoricalRates(from: string | null, to: string | null) {
  const key = from && to ? `${from}:${to}` : null;
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<RateStatus>({ key: '', error: null, series: null });

  useEffect(() => {
    if (!key || !from || !to || cache.has(key)) return;

    let cancelled = false;
    fetchHistoricalRates(from, to)
      .then((next) => {
        if (cancelled) return;
        cache.set(key, next);
        setStatus({ key, error: null, series: next });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus({
          key,
          error: err instanceof Error ? err.message : 'rates',
          series: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [from, to, key, attempt]);

  const cached = key ? cache.get(key) : undefined;
  const matches = status.key === key;
  const series = cached ?? (matches && status.series ? status.series : emptyRateSeries());
  const loading = Boolean(key) && !cached && !matches;
  const error = matches ? status.error : null;

  return {
    series,
    loading,
    error,
    retry: () => {
      if (key) cache.delete(key);
      setStatus({ key: '', error: null, series: null });
      setAttempt((value) => value + 1);
    },
  };
}
