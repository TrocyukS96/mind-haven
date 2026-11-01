'use client';

import type { Goal } from '@/entities/goal/model/types';
import type { Task } from '@/entities/task/model/types';
import { TaskCard } from '@/entities/task/ui/TaskCard';
import { Link } from '@/i18n/routing';
import { getTreeStage, TREE_STAGES, treeVariant, type TreeStage } from '@/shared/lib/forest/tree-stage';
import { getDateLocale } from '@/shared/lib/date-locale';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { TreeIllustration } from '@/widgets/dashboard/ui/tree-illustration';

type StepFilter = 'all' | 'active' | 'done';
type TreeTab = 'steps' | 'notes' | 'stats' | 'files';

function goalSteps(goal: Goal, tasks: Task[]): Task[] {
  const linked = tasks.filter((task) => task.goalId === goal.id);
  const known = new Set(linked.map((task) => task.id));
  const embedded = (goal.tasks ?? []).filter((task) => !known.has(task.id));
  return [...linked, ...embedded];
}

export function GoalTreePage({ goalId }: { goalId: string }) {
  const t = useTranslations('tree');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);
  const hydrated = useStoreHydrated();
  const goal = useStore((state) => state.goals.find((item) => item.id === goalId));
  const tasks = useStore((state) => state.tasks);
  const activityEvents = useStore((state) => state.activityEvents);
  const openTaskForm = useStore((state) => state.openTaskForm);
  const [filter, setFilter] = useState<StepFilter>('all');
  const [tab, setTab] = useState<TreeTab>('steps');

  const steps = useMemo(() => (goal ? goalSteps(goal, tasks) : []), [goal, tasks]);
  const visibleSteps = steps.filter((step) => {
    if (filter === 'active') return !step.completed;
    if (filter === 'done') return step.completed;
    return true;
  });

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t('notFound')}</h1>
        <p className="text-sm text-muted-foreground">{t('notFoundHint')}</p>
        <Button asChild>
          <Link href="/">{t('back')}</Link>
        </Button>
      </div>
    );
  }

  const progress = Math.max(0, Math.min(100, Number(goal.progress) || 0));
  const stage = getTreeStage(progress);
  const completed = steps.filter((step) => step.completed).length;
  const open = steps.length - completed;
  const deadline = goal.deadline ? new Date(goal.deadline) : null;
  const deadlineLabel =
    deadline && !Number.isNaN(deadline.getTime())
      ? format(deadline, 'd MMMM yyyy', { locale: dateLocale })
      : null;
  const history = activityEvents
    .filter(
      (event) =>
        event.metadata?.goalId === goal.id ||
        (event.entityType === 'GOAL' && event.entityId === goal.id) ||
        steps.some((step) => step.id === event.entityId)
    )
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} />
        {t('back')}
      </Link>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.8fr)]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border bg-card/80">
            <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{goal.title}</h1>
                {goal.description ? (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{goal.description}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-foreground">{t('stepsMeta', { count: steps.length })}</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-foreground">{t('doneMeta', { progress })}</span>
                  {deadlineLabel ? (
                    <span className="rounded-full bg-muted px-2.5 py-1">{deadlineLabel}</span>
                  ) : null}
                </div>
              </div>
              <div className="rounded-xl border bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">{t('stageLabel')}</p>
                <p className="mt-1 font-medium">{t(`stages.${stage}`)}</p>
                <div className="mt-3 flex gap-1 overflow-x-auto">
                  {TREE_STAGES.map((item) => (
                    <StageMark key={item} stage={item} active={item === stage} label={t(`stages.${item}`)} />
                  ))}
                </div>
              </div>
            </div>
            <div className="h-56 bg-gradient-to-b from-primary/5 to-transparent sm:h-72">
              <TreeIllustration stage={stage} variant={treeVariant(goal.id)} className="mx-auto max-w-md" />
            </div>
          </section>

          <section className="rounded-2xl border bg-card/80 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">{t('progressTitle')}</h2>
              <span className="text-sm tabular-nums text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-primary/15">
              <div className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${progress}%` }} />
            </div>
          </section>

          <section className="rounded-2xl border bg-card/80 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              {(['steps', 'notes', 'stats', 'files'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm',
                    tab === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  {t(`tabs.${item}`)}
                </button>
              ))}
            </div>

            {tab === 'steps' ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    {(['all', 'active', 'done'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setFilter(item)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs',
                          filter === item ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                        )}
                      >
                        {t(`filters.${item}`)}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" onClick={() => openTaskForm(undefined, goal.id)}>
                    <Plus size={16} />
                    {t('addStep')}
                  </Button>
                </div>
                {visibleSteps.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t('emptySteps')}</p>
                ) : (
                  <ul className="space-y-1">
                    {visibleSteps.map((step) => (
                      <li key={step.id}>
                        <TaskCard task={step} variant="step" showMeta />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {tab === 'notes' ? <p className="mt-6 text-sm text-muted-foreground">{t('notesEmpty')}</p> : null}

            {tab === 'stats' ? (
              <div className="mt-6 space-y-4">
                <StatsCounts total={steps.length} completed={completed} open={open} />
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('statsNoHistory')}</p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((event) => (
                      <li key={event.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{event.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {format(new Date(event.createdAt), 'd MMM', { locale: dateLocale })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {tab === 'files' ? <p className="mt-6 text-sm text-muted-foreground">{t('filesEmpty')}</p> : null}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card/80 p-4">
            <h2 className="text-sm font-semibold">{t('focusTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {goal.description?.trim() ? goal.description : t('focusEmpty')}
            </p>
          </section>
          <section className="rounded-2xl border bg-card/80 p-4">
            <h2 className="text-sm font-semibold">{t('notesTitle')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('notesEmpty')}</p>
          </section>
          <section className="rounded-2xl border bg-card/80 p-4">
            <h2 className="text-sm font-semibold">{t('statsTitle')}</h2>
            <div className="mt-3">
              <StatsCounts total={steps.length} completed={completed} open={open} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StageMark({ stage, active, label }: { stage: TreeStage; active: boolean; label: string }) {
  return (
    <div
      title={label}
      className={cn(
        'h-12 w-12 shrink-0 rounded-lg border p-0.5',
        active ? 'border-primary bg-primary/10' : 'border-transparent opacity-50'
      )}
    >
      <TreeIllustration stage={stage} />
    </div>
  );
}

function StatsCounts({ total, completed, open }: { total: number; completed: number; open: number }) {
  const t = useTranslations('tree');
  const items = [
    { value: total, label: t('statsTotal') },
    { value: completed, label: t('statsDone') },
    { value: open, label: t('statsOpen') },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-primary/5 px-2 py-3 text-center">
          <p className="text-xl font-semibold tabular-nums">{item.value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
