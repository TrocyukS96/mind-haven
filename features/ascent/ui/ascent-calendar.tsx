'use client';

import type { ChallengeDayKind, ChallengeMonthCell } from '@/features/ascent/model/dashboard';
import { buildChallengeMonth, shiftMonth } from '@/features/ascent/model/dashboard';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Check, ChevronLeft, ChevronRight, Minus, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const KIND_LABEL = {
  successful: 'home.legendSuccess',
  failed: 'home.legendFailed',
  skipped: 'home.legendSkipped',
  current: 'home.legendCurrent',
  future: 'home.legendFuture',
  'before-start': 'home.legendBefore',
  unsettled: 'home.legendUnsettled',
  outside: 'home.legendOutside',
} as const;

interface AscentCalendarProps {
  localDate: string;
  startsOn: string;
  challengeStatus: string;
  days: readonly { localDate: string; status: string }[];
}

export function AscentCalendar({ localDate, startsOn, challengeStatus, days }: AscentCalendarProps) {
  const t = useTranslations('ascent');
  const tHabits = useTranslations('habits');
  const locale = useLocale();
  const [month, setMonth] = useState(localDate.slice(0, 7));

  useEffect(() => {
    setMonth(localDate.slice(0, 7));
  }, [localDate]);

  const cells = buildChallengeMonth({ month, localDate, startsOn, challengeStatus, days });
  const [year, monthIndex] = month.split('-').map(Number);
  const monthLabel = new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const firstMonth = startsOn.slice(0, 7);
  const lastMonth = localDate.slice(0, 7);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('home.previousMonth')}
          disabled={month <= firstMonth}
          onClick={() => setMonth((current) => shiftMonth(current, -1))}
        >
          <ChevronLeft />
        </Button>
        <h3 className="text-sm font-medium capitalize">{monthLabel}</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('home.nextMonth')}
          disabled={month >= lastMonth}
          onClick={() => setMonth((current) => shiftMonth(current, 1))}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day}>{tHabits(`weekdays.${day}`)}</div>
        ))}
      </div>
      <ul className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => (
          <li key={cell.date ?? `pad-${index}`}>
            <MonthCell cell={cell} label={cell.kind === 'pad' ? '' : t(KIND_LABEL[cell.kind])} />
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {(['successful', 'failed', 'current', 'future', 'before-start'] as const).map((kind) => (
          <li key={kind} className="inline-flex items-center gap-1.5">
            <StatusMark kind={kind} />
            <span>{t(KIND_LABEL[kind])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthCell({ cell, label }: { cell: ChallengeMonthCell; label: string }) {
  if (!cell.date || cell.kind === 'pad') return <div className="aspect-square" />;
  const day = Number(cell.date.slice(8, 10));
  return (
    <div
      className={cn(
        'flex aspect-square flex-col items-center justify-center rounded-md text-xs tabular-nums',
        cell.kind === 'successful' && 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
        cell.kind === 'failed' && 'bg-destructive/15 text-destructive',
        cell.kind === 'current' && 'bg-primary/10 font-semibold text-foreground ring-2 ring-primary',
        cell.kind === 'future' && 'text-muted-foreground/70',
        cell.kind === 'before-start' && 'border border-dashed text-muted-foreground',
        cell.kind === 'skipped' && 'bg-muted text-muted-foreground',
        cell.kind === 'unsettled' && 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
        cell.kind === 'outside' && 'text-muted-foreground/50'
      )}
      aria-label={`${cell.date}. ${label}`}
    >
      <span>{day}</span>
      <StatusMark kind={cell.kind} />
    </div>
  );
}

function StatusMark({ kind }: { kind: ChallengeDayKind }) {
  if (kind === 'successful') return <Check className="size-3" aria-hidden />;
  if (kind === 'failed') return <X className="size-3" aria-hidden />;
  if (kind === 'before-start') return <Minus className="size-3" aria-hidden />;
  if (kind === 'current') return <span aria-hidden className="mt-0.5 size-1.5 rounded-full bg-primary" />;
  return null;
}
