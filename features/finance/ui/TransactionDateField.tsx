'use client';

import { Calendar } from '@/shared/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { getDateLocale } from '@/shared/lib/date-locale';
import { cn } from '@/shared/lib/utils';
import {
  shiftLocalIsoDate,
  toLocalIsoDate,
} from '@/features/finance/lib/transaction-form-initial-values';
import { ChevronDownIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

interface TransactionDateFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

function parseIsoDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDisplayDate(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

export function TransactionDateField({ id, value, onChange }: TransactionDateFieldProps) {
  const t = useTranslations('finance');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const today = shiftLocalIsoDate(0);
  const yesterday = shiftLocalIsoDate(-1);
  const dayBeforeYesterday = shiftLocalIsoDate(-2);

  const preset =
    value === today
      ? 'today'
      : value === yesterday
        ? 'yesterday'
        : value === dayBeforeYesterday
          ? 'dayBeforeYesterday'
          : 'custom';

  const label =
    preset === 'today'
      ? t('dateToday')
      : preset === 'yesterday'
        ? t('dateYesterday')
        : preset === 'dayBeforeYesterday'
          ? t('dateDayBeforeYesterday')
          : formatDisplayDate(value);

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            id={id}
            type="button"
            aria-label={`${t('date')}: ${label}`}
            className={cn(
              'border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]'
            )}
          >
            <span>{label}</span>
            <ChevronDownIcon className="size-4 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width)">
          <DropdownMenuRadioGroup
            value={preset}
            onValueChange={(next) => {
              if (next === 'today') {
                onChange(today);
                setCalendarOpen(false);
              }
              if (next === 'yesterday') {
                onChange(yesterday);
                setCalendarOpen(false);
              }
              if (next === 'dayBeforeYesterday') {
                onChange(dayBeforeYesterday);
                setCalendarOpen(false);
              }
              if (next === 'custom') setCalendarOpen(true);
            }}
          >
            <DropdownMenuRadioItem value="today">{t('dateToday')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="yesterday">{t('dateYesterday')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dayBeforeYesterday">
              {t('dateDayBeforeYesterday')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="custom" onSelect={() => setCalendarOpen(true)}>
              {t('dateFromCalendar')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {calendarOpen && (
        <div className="w-fit rounded-md border">
          <Calendar
            mode="single"
            locale={dateLocale}
            selected={parseIsoDate(value)}
            captionLayout="dropdown"
            onSelect={(nextDate) => {
              if (!nextDate) return;
              onChange(toLocalIsoDate(nextDate));
              setCalendarOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
