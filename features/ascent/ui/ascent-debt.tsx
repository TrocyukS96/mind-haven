'use client';

import type { AscentDebtView } from '@/features/ascent/api/ascent-home';
import { summarizeDebt } from '@/features/ascent/model/dashboard';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface AscentDebtProps {
  items: AscentDebtView[];
  pendingId: string | null;
  errorId: string | null;
  onHabit: (item: AscentDebtView) => void;
  onManual: (item: AscentDebtView, confirmed: boolean) => void;
  onRestriction: (item: AscentDebtView, confirmed: boolean) => void;
}

function applicable(items: readonly AscentDebtView[], source: AscentDebtView['source'] | 'action') {
  return items
    .filter((item) => item.required && item.state !== 'not_applicable')
    .filter((item) => (source === 'action' ? item.source !== 'restriction' : item.source === source))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
}

export function AscentDebt({ items, pendingId, errorId, onHabit, onManual, onRestriction }: AscentDebtProps) {
  const t = useTranslations('ascent');
  const summary = summarizeDebt(items);
  const actions = applicable(items, 'action');
  const restrictions = applicable(items, 'restriction');
  const percent = summary.total === 0 ? 0 : Math.round((summary.done / summary.total) * 100);

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('home.debtTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('home.debtCount', { done: summary.done, total: summary.total })}</p>
          </div>
          <p className="font-mono text-sm tabular-nums text-muted-foreground">{percent}%</p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={summary.total}
          aria-valuenow={summary.done}
          aria-label={t('home.debtTitle')}
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>

        {summary.total === 0 ? <p className="text-sm text-muted-foreground">{t('home.debtEmpty')}</p> : null}

        <DebtGroup title={t('home.actionsTitle')} items={actions} pendingId={pendingId} errorId={errorId} renderAction={(item) => {
          const done = item.state === 'satisfied' || item.state === 'bypassed';
          const locked = item.state === 'missed' && item.confirmedByUser;
          return (
            <Button
              type="button"
              variant={done ? 'secondary' : 'outline'}
              size="sm"
              aria-pressed={done}
              aria-label={
                item.source === 'habit'
                  ? t(done ? 'home.unmarkHabit' : 'home.markHabit', { title: item.title })
                  : t(done ? 'home.unmarkDebt' : 'home.markDebt', { title: item.title })
              }
              className="h-auto whitespace-normal"
              loading={pendingId === item.id}
              disabled={locked || (pendingId !== null && pendingId !== item.id)}
              onClick={() => (item.source === 'habit' ? onHabit(item) : onManual(item, !done))}
            >
              {t(done ? 'home.unmark' : 'home.mark')}
            </Button>
          );
        }} />

        <div className="space-y-3">
          <DebtGroup title={t('home.limitsTitle')} items={restrictions} pendingId={pendingId} errorId={errorId} statePrefix="restrictionState" renderAction={(item) => {
            const done = item.state === 'satisfied';
            const locked = item.state === 'bypassed' || (item.state === 'missed' && item.confirmedByUser);
            return (
              <Button
                type="button"
                variant={done ? 'secondary' : 'outline'}
                size="sm"
                aria-pressed={done}
                aria-label={t(done ? 'home.undoRestriction' : 'home.confirmRestriction', { title: item.title })}
                className="h-auto whitespace-normal"
                loading={pendingId === item.id}
                disabled={locked || (pendingId !== null && pendingId !== item.id)}
                onClick={() => onRestriction(item, !done)}
              >
                {t(done ? 'home.undoShort' : 'home.confirmShort')}
              </Button>
            );
          }} />
          {restrictions.length > 0 ? <p className="text-sm text-muted-foreground">{t('home.restrictionHint')}</p> : null}
        </div>

        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm leading-6">{t('home.debtWarning')}</p>
      </CardContent>
    </Card>
  );
}

function DebtGroup({
  title,
  items,
  pendingId,
  errorId,
  statePrefix = 'state',
  renderAction,
}: {
  title: string;
  items: AscentDebtView[];
  pendingId: string | null;
  errorId: string | null;
  statePrefix?: 'state' | 'restrictionState';
  renderAction: (item: AscentDebtView) => ReactNode;
}) {
  const t = useTranslations('ascent');
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border px-3 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{item.title}</p>
                <p className={cn('mt-1 text-sm', item.state === 'missed' ? 'text-destructive' : 'text-muted-foreground')}>
                  {t(`home.${statePrefix}.${item.state}`)}
                </p>
              </div>
              <div className="shrink-0">{renderAction(item)}</div>
            </div>
            {errorId === item.id ? (
              <p className="mt-2 text-sm text-destructive" role="alert">{t('home.actionError')}</p>
            ) : null}
            {pendingId === item.id ? <span className="sr-only">{t('home.saving')}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
