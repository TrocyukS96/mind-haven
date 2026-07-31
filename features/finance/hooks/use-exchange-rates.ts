'use client';

import { useEffect, useState } from 'react';
import { fetchExchangeRates } from '@/entities/finance/api/exchange-rates-client';
import type { ExchangeRatesMap } from '@/shared/lib/finance/nbrb-exchange-service';

interface UseExchangeRatesResult {
  rates: ExchangeRatesMap | null;
  loading: boolean;
  error: string | null;
  source: string | null;
}

export function useExchangeRates(): UseExchangeRatesResult {
  const [rates, setRates] = useState<ExchangeRatesMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchExchangeRates()
      .then((payload) => {
        if (cancelled) return;
        setRates(payload.rates);
        setSource(payload.source);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load rates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { rates, loading, error, source };
}
