'use client';

import type { Habit } from '@/entities/habit/model/types';
import { resolveHabitTrackingType } from '@/entities/habit/model/tracking-type';
import { parseHabitDate } from '@/shared/lib/habit/habit-date';
import { isHabitScheduledOn } from '@/shared/lib/habit/habit-weekdays';
import { getHabitCountPresentation, isHabitDayMet } from '@/shared/lib/habit/habit-progress';
import { cn } from '@/shared/lib/utils';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

interface HabitDayCellProps {
  habit: Habit;
  date: string;
  today: string;
  showDateNumber?: boolean;
  fill?: boolean;
}

function HabitCountLabel({
  count,
  target,
  showTarget,
  tone,
}: {
  count: number;
  target: number;
  showTarget: boolean;
  tone: 'empty' | 'under' | 'exact' | 'over';
}) {
  const actualClass = !showTarget
    ? 'text-foreground'
    : tone === 'exact'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'over'
        ? 'text-[#C8962E] dark:text-[#E3B341]'
        : 'text-foreground';
  const restClass = showTarget && tone === 'exact' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground';

  return (
    <span className="whitespace-nowrap text-[10px] font-semibold leading-none tabular-nums lg:text-xs">
      <span className={actualClass}>{count}</span>
      {showTarget ? <span className={restClass}>/{target}</span> : null}
    </span>
  );
}

export function HabitDayCell({ habit, date, today, showDateNumber = false, fill = false }: HabitDayCellProps) {
  const { toggleHabitDay, setHabitDayCount } = useStore();
  const t = useTranslations('habits');
  const locale = useLocale();
  const isFuture = date > today;
  const isOffDay = !isHabitScheduledOn(habit.frequency, date);
  const isInactive = isFuture || isOffDay;
  const formattedDate = parseHabitDate(date).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
  });
  const dayNumber = parseHabitDate(date).getDate();

  if (habit.targetCount == null) {
    const isCompleted = isHabitDayMet(habit, date);

    return (
      <button
        type="button"
        onClick={() => !isInactive && void toggleHabitDay(habit.id, date)}
        disabled={isInactive}
        aria-label={
          isCompleted ? t('unmarkDay', { date: formattedDate }) : t('markDay', { date: formattedDate })
        }
        className={cn(
          'mx-auto flex items-center justify-center rounded-md border-2 transition-all',
          fill ? 'h-11 w-full' : 'size-8',
          isCompleted
            ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm'
            : 'border-border bg-background',
          isInactive ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-primary hover:bg-primary/5'
        )}
      >
        {isCompleted ? (
          <Check size={16} strokeWidth={3} />
        ) : showDateNumber ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">{dayNumber}</span>
        ) : null}
      </button>
    );
  }

  return (
    <HabitCountButton
      habit={habit}
      date={date}
      target={habit.targetCount}
      today={today}
      isFuture={isInactive}
      formattedDate={formattedDate}
      dayNumber={dayNumber}
      showDateNumber={showDateNumber}
      fill={fill}
      onSave={(count) => setHabitDayCount(habit.id, date, count)}
    />
  );
}

function HabitCountButton({
  habit,
  date,
  target,
  today,
  isFuture,
  formattedDate,
  dayNumber,
  showDateNumber,
  fill,
  onSave,
}: {
  habit: Habit;
  date: string;
  target: number;
  today: string;
  isFuture: boolean;
  formattedDate: string;
  dayNumber: number;
  showDateNumber: boolean;
  fill: boolean;
  onSave: (count: number) => Promise<void>;
}) {
  const t = useTranslations('habits');
  const count = habit.dayCounts[date] ?? 0;
  const trackingType = resolveHabitTrackingType(habit);
  const unit = trackingType === 'check' ? '' : t(`trackingUnits.${trackingType}`);
  const presentation = getHabitCountPresentation(habit, date, today);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  function handleOpenChange(next: boolean) {
    if (isFuture) return;
    setOpen(next);
    if (next) {
      setDraft(count > 0 ? String(count) : '');
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number(draft);
    if (!Number.isInteger(parsed) || parsed < 0) return;
    await onSave(parsed);
    setOpen(false);
  }

  const button = (
    <button
      type="button"
      disabled={isFuture}
      aria-label={
        presentation
          ? t('countForDay', { date: formattedDate, count: presentation.value, target })
          : t('logCountForDay', { date: formattedDate, target })
      }
      className={cn(
        'mx-auto flex items-center justify-center rounded-md border-2 transition-all',
        fill ? 'h-11 w-full px-1' : presentation ? 'h-8 w-full max-w-[4.75rem] px-0.5' : 'size-8',
        presentation?.showTarget && presentation.tone === 'exact' && 'border-emerald-600/40 bg-emerald-600/10',
        presentation?.showTarget && presentation.tone === 'over' && 'border-[#C8962E]/40 bg-[#C8962E]/10',
        (!presentation?.showTarget || presentation.tone === 'under') && 'border-border bg-background',
        isFuture ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-primary hover:bg-primary/5'
      )}
    >
      {presentation ? (
        <HabitCountLabel
          count={presentation.value}
          target={target}
          showTarget={presentation.showTarget}
          tone={presentation.tone}
        />
      ) : showDateNumber ? (
        <span className="text-[11px] tabular-nums text-muted-foreground">{dayNumber}</span>
      ) : null}
    </button>
  );

  if (isFuture) {
    return button;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent className="w-56 p-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('logCountTitle')}</p>
            <p className="text-xs text-muted-foreground">
              {t('logCountHint', { count: target, unit })}
            </p>
          </div>
          <Input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
            aria-label={t('logCountTitle')}
            className="h-9"
          />
          <div className="flex justify-end gap-2">
            {count > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void onSave(0).then(() => setOpen(false));
                }}
              >
                {t('clearCount')}
              </Button>
            ) : null}
            <Button type="submit" size="sm">
              {t('saveCount')}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
