'use client';

import type { Habit } from '@/entities/habit/model/types';
import { HabitDeleteButton } from '@/entities/habit/ui/HabitDeleteButton';
import { HabitVoiceButton } from '@/features/habit/ui/HabitVoiceButton';
import { useHabitSync } from '@/features/habit/hooks/use-habit-sync';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { cn } from '@/shared/lib/utils';
import { Check, CheckSquare, Flame, Plus, TrendingUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

interface HabitsPageProps {
  initialHabits?: Habit[] | null;
}

export function HabitsPage({ initialHabits = null }: HabitsPageProps) {
  const hydrated = useStoreHydrated();
  useHabitSync({ initialHabits });
  const { habits, toggleHabitDay, openHabitForm } = useStore();
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const getDaysOfWeek = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const daysOfWeek = getDaysOfWeek();
  const today = new Date().toISOString().split('T')[0];
  const bestStreak = habits.length ? Math.max(...habits.map((h) => h.streak)) : 0;
  const completedTodayCount = habits.filter((h) => h.completedDays.includes(today)).length;

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
          <HabitVoiceButton />
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
                  {completedTodayCount}/{habits.length}
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
          <Card className="hidden overflow-hidden lg:block">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <CardTitle className="text-lg">{t('habitTracker')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="sticky left-0 z-10 min-w-[180px] border-r bg-muted/30 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('habitColumn')}
                      </th>
                      <th className="min-w-[72px] px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('streakColumn')}
                      </th>
                      {daysOfWeek.map((date, index) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const isToday = dateStr === today;
                        return (
                          <th
                            key={index}
                            className={cn(
                              'min-w-[56px] px-2 py-3 text-center text-xs font-medium uppercase tracking-wide',
                              isToday ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                            )}
                          >
                            <div>
                              {date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                                weekday: 'short',
                              })}
                            </div>
                            <div
                              className={cn(
                                'mt-0.5 text-[11px] font-normal normal-case',
                                isToday ? 'text-primary' : 'text-muted-foreground'
                              )}
                            >
                              {date.getDate()}
                            </div>
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
                              <p className="mt-0.5 text-xs text-muted-foreground">{habit.frequency}</p>
                            </div>
                            <HabitDeleteButton habit={habit} />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1">
                            <Flame size={14} className="text-orange-500" />
                            <span className="text-sm font-semibold tabular-nums">{habit.streak}</span>
                          </div>
                        </td>
                        {daysOfWeek.map((date, index) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const isCompleted = habit.completedDays.includes(dateStr);
                          const isToday = dateStr === today;
                          return (
                            <td
                              key={index}
                              className={cn('px-2 py-3 text-center', isToday && 'bg-primary/5')}
                            >
                              <button
                                type="button"
                                onClick={() => isToday && void toggleHabitDay(habit.id, dateStr)}
                                disabled={!isToday}
                                aria-label={
                                  isCompleted ? t('completedTodayBtn') : t('markCompletion')
                                }
                                className={cn(
                                  'mx-auto flex size-8 items-center justify-center rounded-md border-2 transition-all',
                                  isCompleted
                                    ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm'
                                    : 'border-border bg-background',
                                  isToday
                                    ? 'cursor-pointer hover:border-primary hover:bg-primary/5'
                                    : 'cursor-default opacity-40'
                                )}
                              >
                                {isCompleted && <Check size={16} strokeWidth={3} />}
                              </button>
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
            {habits.map((habit) => {
              const isCompletedToday = habit.completedDays.includes(today);
              return (
                <Card key={habit.id}>
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium">{habit.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{habit.frequency}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <div className="inline-flex items-center gap-1 rounded-lg bg-orange-500/10 px-3 py-1">
                            <Flame size={16} className="text-orange-500" />
                            <span className="font-medium tabular-nums">{habit.streak}</span>
                          </div>
                          <HabitDeleteButton habit={habit} />
                        </div>
                      </div>
                      <Button
                        variant={isCompletedToday ? 'outline' : 'default'}
                        className="w-full"
                        onClick={() => void toggleHabitDay(habit.id, today)}
                      >
                        {isCompletedToday ? (
                          <>
                            <CheckSquare size={20} />
                            {t('completedTodayBtn')}
                          </>
                        ) : (
                          <>
                            <Plus size={20} />
                            {t('markCompletion')}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
