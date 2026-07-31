'use client';

import type { CategoryBreakdownItem } from '@/entities/finance/model/types';
import { getCategoryDefinition, CURRENCY_SYMBOLS } from '@/entities/finance/model/categories';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';

interface CategoryBreakdownListProps {
  items: CategoryBreakdownItem[];
  currency: string;
  className?: string;
}

export function CategoryBreakdownList({ items, currency, className }: CategoryBreakdownListProps) {
  const t = useTranslations('finance');
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  if (items.length === 0) {
    return (
      <p className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
        {t('noDataForPeriod')}
      </p>
    );
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item) => {
        const def = getCategoryDefinition(item.category);
        const Icon = def.icon;

        return (
          <li
            key={item.category}
            className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                def.bgColor
              )}
            >
              <Icon size={20} style={{ color: def.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{t(`categories.${item.category}`)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm text-muted-foreground">{item.percentage}%</p>
              <p className="font-medium tabular-nums">
                {item.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {symbol}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
