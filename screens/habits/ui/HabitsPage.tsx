'use client';

import type { Habit } from '@/entities/habit/model/types';
import { HabitDeleteButton } from '@/entities/habit/ui/HabitDeleteButton';
import { HabitEditButton } from '@/features/habit/ui/HabitEditButton';
import { HabitDayCell } from '@/features/habit/ui/HabitDayCell';
import { HabitMonthBoard } from '@/screens/habits/ui/HabitMonthBoard';
import { HabitYearBoard } from '@/screens/habits/ui/HabitYearBoard';
import { useHabitSync } from '@/features/habit/hooks/use-habit-sync';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { resolveHabitTrackingType } from '@/entities/habit/model/tracking-type';
import { ensureHabitShape, isHabitDayMet } from '@/shared/lib/habit/habit-progress';
import {
  formatHabitWeekdayFrequency,
  HABIT_WEEKDAY_MESSAGE_KEY,
  isHabitScheduledOn,
} from '@/shared/lib/habit/habit-weekdays';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import {
  getHabitMonthDates,
  getHabitToday,
  getHabitWeekDates,
  getHabitYearDates,
  parseHabitDate,
  type HabitRange,
} from '@/shared/lib/habit/habit-date';
import { cn } from '@/shared/lib/utils';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { CheckSquare, Flame, Plus, TrendingUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

interface HabitsPageProps {
  initialHabits?: Habit[] | null;
}

export function HabitsPage({ initialHabits = null }: HabitsPageProps) {
  const hydrated = useStoreHydrated();
  useHabitSync({ initialHabits });
  const { habits: storedHabits, openHabitForm } = useStore();
  const habits = storedHabits.map(ensureHabitShape);
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const today = getHabitToday();
  const [range, setRange] = useState<HabitRange>('week');
  const localeTag = locale === 'ru' ? 'ru-RU' : 'en-US';
  const dates =
    range === 'month' ? getHabitMonthDates(today) : range === 'year' ? getHabitYearDates(today) : getHabitWeekDates(today);
  const rangeOptions: { value: HabitRange; label: string }[] = [
    { value: 'week', label: t('ranges.week') },
    { value: 'month', label: t('ranges.month') },
    { value: 'year', label: t('ranges.year') },
  ];

  const habitFrequencyLabel = (habit: Habit) => {
    const frequency = formatHabitWeekdayFrequency(habit.frequency, (day) =>
      t(`weekdays.${HABIT_WEEKDAY_MESSAGE_KEY[day as keyof typeof HABIT_WEEKDAY_MESSAGE_KEY]}`)
    );
    const trackingType = resolveHabitTrackingType(habit);
    if (trackingType === 'check' || habit.targetCount == null) {
      return frequency;
    }

    return t('frequencyWithGoal', {
      frequency,
      count: habit.targetCount,
      unit: t(`trackingUnits.${trackingType}`),
    });
  };
  const bestStreak = habits.length ? Math.max(...habits.map((h) => h.streak)) : 0;
  const dueToday = habits.filter((habit) => isHabitScheduledOn(habit.frequency, today));
  const completedTodayCount = dueToday.filter((habit) => isHabitDayMet(habit, today)).length;

  if (!hydrated) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-24 rounded bg-muted" />
          <div className="h-24 rounded bg-muted" />
          <div className="h-24 rounded bg-muted" />
        </div>
        <div className="h-64 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1>{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button onClick={() => openHabitForm()}>
            <Plus size={20} />
            {t('addHabit')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <CheckSquare size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('activeHabits')}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{habits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-chart-4/10 p-3">
                <Flame size={24} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('bestStreak')}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {tCommon('days', { count: bestStreak })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-chart-2/10 p-3">
                <TrendingUp size={24} className="text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('completedToday')}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {completedTodayCount}/{dueToday.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          icon={Flame}
          title={t('noHabits')}
          description={t('createFirstHabit')}
          actionLabel={t('addHabit')}
          onAction={openHabitForm}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">{t('habitTracker')}</h2>
            <SegmentedControl options={rangeOptions} value={range} onChange={setRange} />
          </div>
          {range === 'month' ? (
            <HabitMonthBoard
              habits={habits}
              dates={dates}
              today={today}
              localeTag={localeTag}
              frequencyLabel={habitFrequencyLabel}
            />
          ) : range === 'year' ? (
            <HabitYearBoard
              habits={habits}
              dates={dates}
              today={today}
              localeTag={localeTag}
              frequencyLabel={habitFrequencyLabel}
            />
          ) : (
            <>
              <Card className="hidden overflow-hidden lg:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max border-collapse text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="sticky left-0 z-10 min-w-[180px] border-r bg-muted/30 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t('habitColumn')}
                          </th>
                          <th className="min-w-[72px] px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t('streakColumn')}
                          </th>
                          {dates.map((dateStr) => {
                            const date = parseHabitDate(dateStr);
                            const isToday = dateStr === today;
                            return (
                              <th
                                key={dateStr}
                                className={cn(
                                  'min-w-[72px] px-2 py-3 text-center text-xs font-medium uppercase tracking-wide',
                                  isToday ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                                )}
                              >
                                <div>{date.toLocaleDateString(localeTag, { weekday: 'short' })}</div>
                                <div className="mt-0.5 text-[11px] font-normal normal-case">{date.getDate()}</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {habits.map((habit, rowIndex) => (
                          <tr
                            key={habit.id}
                            className={cn(
                              'border-b transition-colors hover:bg-muted/30',
                              rowIndex === habits.length - 1 && 'border-b-0'
                            )}
                          >
                            <td className="sticky left-0 z-10 border-r bg-card px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium leading-snug">{habit.name}</p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">{habitFrequencyLabel(habit)}</p>
                                </div>
                                <div className="flex shrink-0 items-center">
                                  <HabitEditButton habit={habit} />
                                  <HabitDeleteButton habit={habit} />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1">
                                <Flame size={14} className="text-orange-500" />
                                <span className="text-sm font-semibold tabular-nums">{habit.streak}</span>
                              </div>
                            </td>
                            {dates.map((dateStr) => {
                              const isToday = dateStr === today;
                              return (
                                <td key={dateStr} className={cn('px-1 py-3 text-center', isToday && 'bg-primary/5')}>
                                  <HabitDayCell habit={habit} date={dateStr} today={today} />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4 lg:hidden">
                {habits.map((habit) => (
                  <Card key={habit.id}>
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium">{habit.name}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{habitFrequencyLabel(habit)}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <div className="inline-flex items-center gap-1 rounded-lg bg-orange-500/10 px-3 py-1">
                              <Flame size={16} className="text-orange-500" />
                              <span className="font-medium tabular-nums">{habit.streak}</span>
                            </div>
                            <HabitEditButton habit={habit} />
                            <HabitDeleteButton habit={habit} />
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                          {dates.map((dateStr) => {
                            const date = parseHabitDate(dateStr);
                            const isToday = dateStr === today;

                            return (
                              <div key={dateStr} className="text-center">
                                <div
                                  className={cn(
                                    'mb-1 text-[10px] font-medium uppercase tracking-wide',
                                    isToday ? 'text-primary' : 'text-muted-foreground'
                                  )}
                                >
                                  {date.toLocaleDateString(localeTag, { weekday: 'short' })}
                                </div>
                                <HabitDayCell habit={habit} date={dateStr} today={today} showDateNumber />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
