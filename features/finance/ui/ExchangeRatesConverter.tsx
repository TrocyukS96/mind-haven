'use client';

import { FINANCE_CURRENCIES } from '@/entities/finance/model/categories';
import type { FinanceCurrency } from '@/entities/finance/model/types';
import {
  buildConverterAmounts,
  parseConverterInput,
} from '@/entities/finance/lib/currency-converter';
import type { ExchangeRatesMap } from '@/shared/lib/finance/nbrb-exchange-service';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const CONVERTER_CURRENCY_ORDER: FinanceCurrency[] = ['USD', 'BYN', 'RUB', 'CNY'];
const DEFAULT_SOURCE: FinanceCurrency = 'USD';
const DEFAULT_AMOUNT = 1;

interface ExchangeRatesConverterProps {
  rates: ExchangeRatesMap;
  className?: string;
}

export function ExchangeRatesConverter({ rates, className }: ExchangeRatesConverterProps) {
  const t = useTranslations('finance.ratesModal');
  const [amounts, setAmounts] = useState<Record<FinanceCurrency, string>>(() =>
    buildConverterAmounts(DEFAULT_AMOUNT, DEFAULT_SOURCE, rates)
  );
  const [activeCurrency, setActiveCurrency] = useState<FinanceCurrency>(DEFAULT_SOURCE);

  useEffect(() => {
    setAmounts(buildConverterAmounts(DEFAULT_AMOUNT, DEFAULT_SOURCE, rates));
    setActiveCurrency(DEFAULT_SOURCE);
  }, [rates]);

  const handleChange = (currency: FinanceCurrency, rawValue: string) => {
    setActiveCurrency(currency);

    const sanitized = rawValue.replace(/[^\d.,-]/g, '');
    const parsed = parseConverterInput(sanitized);

    if (parsed === null) {
      setAmounts((prev) => ({ ...prev, [currency]: sanitized }));
      return;
    }

    setAmounts(buildConverterAmounts(parsed, currency, rates));
  };

  const handleFocus = (currency: FinanceCurrency) => {
    setActiveCurrency(currency);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {CONVERTER_CURRENCY_ORDER.map((currency) => {
        const isActive = activeCurrency === currency;

        return (
          <div
            key={currency}
            className={cn(
              'grid grid-cols-[4.5rem_1fr] items-center gap-3 rounded-xl border bg-card p-3 transition-colors',
              isActive && 'border-primary/50 ring-1 ring-primary/20'
            )}
          >
            <span className="text-base font-semibold tracking-wide">{currency}</span>

            <div className="min-w-0 space-y-1">
              <Input
                type="text"
                inputMode="decimal"
                value={amounts[currency]}
                onChange={(event) => handleChange(currency, event.target.value)}
                onFocus={() => handleFocus(currency)}
                className="h-11 text-right text-base tabular-nums"
                aria-label={t(`currencyNames.${currency}`)}
              />
              <p className="text-right text-xs text-muted-foreground">
                {t(`currencyNames.${currency}`)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
