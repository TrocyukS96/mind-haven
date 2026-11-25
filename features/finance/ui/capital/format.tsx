'use client';

import type { FinanceCurrency } from '@/entities/finance/model/types';
import type { ValuedAmount } from '@/shared/lib/finance/historical-rates';
import { CURRENCY_SYMBOLS } from '@/entities/finance/model/categories';
import { cn } from '@/shared/lib/utils';

export function formatMoney(amount: number, currency: FinanceCurrency): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}

export function toneClass(amount: number | null | undefined): string {
  if (amount == null || amount === 0) return 'text-muted-foreground';
  return amount > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-destructive';
}

export function ValuedText({
  value,
  currency,
  signed = false,
}: {
  value: ValuedAmount;
  currency: FinanceCurrency;
  signed?: boolean;
}) {
  if (value.amount == null) return <span title="no-rate">—</span>;
  const prefix = signed && value.amount > 0 ? '+' : '';
  return (
    <span className={cn('tabular-nums', signed && toneClass(value.amount))} title={value.approximate ? value.rateDate ?? '' : undefined}>
      {value.approximate ? '~' : ''}
      {prefix}
      {formatMoney(value.amount, currency)}
    </span>
  );
}
