'use client';

import type { Goal } from '@/entities/goal/model/types';
import type { Task } from '@/entities/task/model/types';
import { isAuthenticatedUser } from '@/entities/user';
import { useAccess } from '@/features/access';
import { Link } from '@/i18n/routing';
import { getTreeStage, treeVariant } from '@/shared/lib/forest/tree-stage';
import { getDateLocale } from '@/shared/lib/date-locale';
import { getHabitToday, getHabitWeekDates } from '@/shared/lib/habit/habit-date';
import { ensureHabitShape, isHabitDayMet } from '@/shared/lib/habit/habit-progress';
import { isHabitScheduledOn } from '@/shared/lib/habit/habit-weekdays';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { format } from 'date-fns';
import { Apple, Check, Footprints, Leaf, Plus, Sprout } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { ForestBackdrop } from './forest-backdrop';
import { TreeIllustration } from './tree-illustration';

function dateKey(value: string | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function stepsForGoal(goal: Goal, tasks: Task[]) {
  const linked = tasks.filter((task) => task.goalId === goal.id);
  if (linked.length > 0) return linked;
  return goal.tasks ?? [];
}

export function ForestDashboard() {
  const t = useTranslations('dashboard');
  const tPriority = useTranslations('priorities');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);
  const hydrated = useStoreHydrated();
  const { profile, canAccessFeature } = useAccess();
  const goals = useStore((state) => state.goals);
  const tasks = useStore((state) => state.tasks);
  const habits = useStore((state) => state.habits);
  const journalEntries = useStore((state) => state.journalEntries);
  const openGoalForm = useStore((state) => state.openGoalForm);

  const showGoals = canAccessFeature('goals');
  const showTasks = canAccessFeature('tasks');
  const showHabits = canAccessFeature('habits');
  const showJournal = canAccessFeature('journal');

  if (!hydrated) {
    return (
      <div>
        <div className="-mt-14 h-[calc(3.5rem+1rem+16rem)] animate-pulse bg-muted sm:-mt-16 sm:h-[calc(4rem+1.5rem+20rem)] lg:h-[calc(4rem+2rem+20rem)]" />
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-4 sm:px-6 lg:px-8">
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  const today = getHabitToday();
  const treeCount = goals.length;
  const completedSteps = tasks.filter((task) => task.completed).length;
  const activeHabits = habits.length;
  const fruits = goals.filter((goal) => goal.progress >= 100).length;
  const name = isAuthenticatedUser(profile) ? profile.name?.trim() : '';
  const weekDates = getHabitWeekDates(today);
  const deadlineDays = new Set(
    tasks.flatMap((task) => {
      const key = dateKey(task.deadline);
      return key ? [key] : [];
    })
  );
  const todaySteps = tasks.filter((task) => !task.completed && dateKey(task.deadline) === today).slice(0, 4);
  const upcoming = [...tasks]
    .filter((task) => !task.completed)
    .sort((a, b) => {
      const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })
    .slice(0, 5);
  const latestEntries = [...journalEntries]
    .sort((a, b) => (dateKey(b.date) ?? '').localeCompare(dateKey(a.date) ?? ''))
    .slice(0, 3);

  return (
    <div>
      <section className="relative -mt-14 h-[calc(3.5rem+1rem+16rem)] overflow-hidden sm:-mt-16 sm:h-[calc(4rem+1.5rem+20rem)] lg:h-[calc(4rem+2rem+20rem)]">
        <ForestBackdrop />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 from-0% via-background/40 via-[20%] to-transparent to-[48%]" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
          <div className="mt-auto flex h-64 flex-col justify-center space-y-3 sm:h-80">
            <p className="text-sm text-foreground/80">{name ? t('greeting', { name }) : t('greetingGuest')}</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('heroTitle')}</h1>
            <p className="max-w-xl text-sm text-foreground/80 sm:text-base">
              {t('heroSubtitle', { trees: treeCount, steps: tasks.length })}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Sprout} value={treeCount} label={t('statsTrees', { count: treeCount })} />
        <Stat icon={Footprints} value={completedSteps} label={t('statsSteps', { count: completedSteps })} />
        <Stat icon={Leaf} value={activeHabits} label={t('statsHabits', { count: activeHabits })} />
        <Stat icon={Apple} value={fruits} label={t('statsFruits', { count: fruits })} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-6">
          {showGoals ? (
            <section className="rounded-2xl border bg-card/80 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{t('forestSection')}</h2>
                <Button size="sm" onClick={() => openGoalForm()}>
                  <Plus size={16} />
                  {t('plantTree')}
                </Button>
              </div>
              {goals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('emptyForest')}</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {goals.map((goal) => {
                    const progress = Math.max(0, Math.min(100, Number(goal.progress) || 0));
                    const steps = stepsForGoal(goal, tasks);
                    const deadline = dateKey(goal.deadline);
                    return (
                      <Link
                        key={goal.id}
                        href={`/goals/${goal.id}`}
                        className="w-44 shrink-0 rounded-2xl border bg-background/70 p-3 motion-safe:transition-transform motion-safe:hover:scale-[1.02] sm:w-52"
                      >
                        <div className="h-28 rounded-xl bg-primary/5">
                          <TreeIllustration stage={getTreeStage(progress)} variant={treeVariant(goal.id)} />
                        </div>
                        <p className="mt-3 truncate font-medium">{goal.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t('stepsCount', { count: steps.length })}</p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{progress}%</span>
                          <span>{deadline ? format(new Date(`${deadline}T00:00:00`), 'd MMM yyyy', { locale: dateLocale }) : ''}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {showTasks ? (
            <section className="rounded-2xl border bg-card/80 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{t('upcoming')}</h2>
                <Link href="/tasks" className="text-sm text-primary hover:underline">
                  {t('seeAll')}
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">{t('upcomingEmpty')}</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((task) => {
                    const goal = goals.find((item) => item.id === task.goalId);
                    const deadline = dateKey(task.deadline);
                    return (
                      <li key={task.id} className="flex items-start gap-3 rounded-xl border bg-background/60 px-3 py-2.5">
                        <span
                          className={cn(
                            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                            task.completed ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                          )}
                        >
                          {task.completed ? <Check size={12} /> : null}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{task.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {[goal?.title, tPriority(task.priority)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        {deadline ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {format(new Date(`${deadline}T00:00:00`), 'd MMM', { locale: dateLocale })}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <MonthCalendar today={today} marked={deadlineDays} />
          {showTasks ? (
            <section className="rounded-2xl border bg-card/80 p-4 sm:p-5">
              <h2 className="text-lg font-semibold">{t('todayTrail')}</h2>
              {todaySteps.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{t('todayEmpty')}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {todaySteps.map((task) => (
                    <li key={task.id} className="flex items-center gap-2 text-sm">
                      <span className="size-4 rounded border border-border" />
                      <span className="truncate">{task.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {showHabits ? (
          <section className="rounded-2xl border bg-card/80 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Leaf size={18} className="text-primary" />
                {t('habitsPreview')}
              </h2>
              <Link href="/habits" className="text-sm text-primary hover:underline">
                {t('seeAll')}
              </Link>
            </div>
            {habits.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">{t('habitsEmpty')}</p>
            ) : (
              <ul className="space-y-3">
                {habits.slice(0, 4).map((habit) => {
                  const shaped = ensureHabitShape(habit);
                  return (
                    <li key={habit.id} className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm">{habit.name}</span>
                      <span className="flex gap-1">
                        {weekDates.map((date) => {
                          const scheduled = isHabitScheduledOn(shaped.frequency, date);
                          const met = scheduled && date <= today && isHabitDayMet(shaped, date);
                          return (
                            <span
                              key={date}
                              className={cn(
                                'size-2.5 rounded-full',
                                met ? 'bg-primary' : scheduled ? 'bg-primary/20' : 'bg-transparent'
                              )}
                            />
                          );
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {showJournal ? (
          <section className="rounded-2xl border bg-card/80 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{t('journalPreview')}</h2>
              <Link href="/journal" className="text-sm text-primary hover:underline">
                {t('seeAll')}
              </Link>
            </div>
            {latestEntries.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">{t('journalEmpty')}</p>
            ) : (
              <ul className="space-y-3">
                {latestEntries.map((entry) => {
                  const key = dateKey(entry.date);
                  return (
                    <li key={entry.id}>
                      <p className="truncate text-sm font-medium">{entry.title || entry.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {key ? format(new Date(`${key}T00:00:00`), 'd MMM yyyy', { locale: dateLocale }) : ''}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
      </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Sprout;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border bg-card/80 px-4 py-4">
      <Icon size={18} className="text-primary" />
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MonthCalendar({ today, marked }: { today: string; marked: Set<string> }) {
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);
  const [year, month] = today.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const leading = (first.getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const label = format(first, 'LLLL yyyy', { locale: dateLocale });

  return (
    <section className="rounded-2xl border bg-card/80 p-4 sm:p-5">
      <h2 className="text-lg font-semibold capitalize">{label}</h2>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-muted-foreground">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index}>{format(new Date(2026, 0, 5 + index), 'EEEEEE', { locale: dateLocale })}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: leading }, (_, index) => (
          <span key={`pad-${index}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = key === today;
          return (
            <span
              key={key}
              className={cn(
                'relative flex h-8 items-center justify-center rounded-full text-xs',
                isToday && 'bg-primary font-semibold text-primary-foreground'
              )}
            >
              {day}
              {marked.has(key) && !isToday ? (
                <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
              ) : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}
