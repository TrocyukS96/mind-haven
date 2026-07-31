'use client';

import { FINANCE_CURRENCIES, CURRENCY_SYMBOLS } from '@/entities/finance/model/categories';
import type { FinanceCurrency } from '@/entities/finance/model/types';
import { getRatesDate } from '@/entities/finance/api/exchange-rates-client';
import { ExchangeRatesConverter } from '@/features/finance/ui/ExchangeRatesConverter';
import type { ExchangeRatesMap } from '@/shared/lib/finance/nbrb-exchange-service';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { TrendingUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

interface DisplayCurrencySelectorProps {
  value: FinanceCurrency;
  onChange: (currency: FinanceCurrency) => void;
  rates: ExchangeRatesMap | null;
  className?: string;
}

export function DisplayCurrencySelector({
  value,
  onChange,
  rates,
  className,
}: DisplayCurrencySelectorProps) {
  const t = useTranslations('finance');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;
  const [ratesOpen, setRatesOpen] = useState(false);

  const ratesDate = rates ? getRatesDate(rates) : null;
  const formattedDate = ratesDate
    ? format(new Date(ratesDate), 'd MMMM yyyy', { locale: dateLocale })
    : null;

  return (
    <>
      <div className={cn('space-y-3', className)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">{t('displayCurrencyLabel')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRatesOpen(true)}
            disabled={!rates}
          >
            <TrendingUp size={16} />
            {t('ratesButton')}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FINANCE_CURRENCIES.map((currency) => {
            const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
            const isActive = value === currency;

            return (
              <button
                key={currency}
                type="button"
                onClick={() => onChange(currency)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent'
                )}
              >
                <span className="font-medium">{currency}</span>
                <span className="ml-1.5 text-muted-foreground">{symbol}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={ratesOpen} onOpenChange={setRatesOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="space-y-2 border-b px-6 py-5 text-left">
            <DialogTitle className="text-xl">{t('ratesModal.title')}</DialogTitle>
            {formattedDate && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t('ratesModal.description', { date: formattedDate })}
              </p>
            )}
          </DialogHeader>

          <div className="px-6 py-5">
            {!rates ? (
              <p className="text-sm text-muted-foreground">{t('ratesLoading')}</p>
            ) : (
              <ExchangeRatesConverter rates={rates} />
            )}

            <p className="mt-4 text-xs text-muted-foreground">{t('ratesModal.source')}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
