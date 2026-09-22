'use client';

import {
  BookOpen,
  CheckSquare,
  Repeat,
  Scale,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ActivityEvent } from '@/entities/activity/model/types';
import { getActivityCategory, isActivityType } from '@/entities/activity/model/catalog';
import { groupActivityByDate } from '@/entities/activity/lib/group-activity';
import { shiftLocalDate, toLocalDateString } from '@/shared/lib/filters/date-presets';
import { cn } from '@/shared/lib/utils';
import { resolveActivityLink, type ActivityLinkAction } from '../lib/resolve-activity-link';
import { useStore } from '@/shared/store/store-config';
import { useRouter } from '@/i18n/routing';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  TASK: CheckSquare,
  GOAL: Target,
  HABIT: Repeat,
  JOURNAL: BookOpen,
  ENERGY: Zap,
  REFLECTION: Sparkles,
  DECISION: Scale,
};

const CATEGORY_TONES: Record<string, string> = {
  TASK: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  GOAL: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  HABIT: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  JOURNAL: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
  ENERGY: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  REFLECTION: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  DECISION: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

function formatGroupLabel(
  dateKey: string,
  locale: string,
  t: ReturnType<typeof useTranslations>
) {
  const today = toLocalDateString();
  const yesterday = toLocalDateString(shiftLocalDate(new Date(), -1));

  if (dateKey === today) return t('dateGroups.today');
  if (dateKey === yesterday) return t('dateGroups.yesterday');

  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(value: string, locale: string) {
  return new Date(value).toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  const t = useTranslations('activity');
  const locale = useLocale();
  const router = useRouter();
  const store = useStore();
  const groups = groupActivityByDate(events);

  const handleOpen = (action: ActivityLinkAction) => {
    if (action.kind === 'journal') {
      const entry = store.journalEntries.find((item) => item.id === action.entryId);
      if (entry) store.openJournalForm(entry);
      return;
    }

    if (action.kind === 'task') {
      const task = store.tasks.find((item) => item.id === action.taskId);
      if (task) store.openTaskForm(task);
      return;
    }

    if (action.kind === 'goal') {
      const goal = store.goals.find((item) => item.id === action.goalId);
      if (goal) store.openGoalForm(goal);
      return;
    }

    if (action.kind === 'habit') {
      router.push('/habits');
      return;
    }

    if (action.kind === 'energy') {
      const checkIn = store.energyCheckIns.find((item) => item.id === action.checkInId);
      if (checkIn) store.openEnergyResult(checkIn);
    }
  };

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.dateKey} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {formatGroupLabel(group.dateKey, locale, t)}
          </h3>
          <ul className="space-y-2">
            {group.events.map((event) => {
              const category = getActivityCategory(event.type) ?? event.entityType;
              const Icon = CATEGORY_ICONS[category] ?? BookOpen;
              const link = resolveActivityLink(event, store);
              const label = isActivityType(event.type)
                ? t(`events.${event.type}`)
                : event.type;
              const subtitle =
                category === 'ENERGY' && typeof event.metadata.score === 'number'
                  ? t('energyScore', { score: Number(event.metadata.score).toFixed(1) })
                  : event.title;

              const content = (
                <>
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full',
                      CATEGORY_TONES[category] ?? 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    {subtitle && (
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {subtitle}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatTime(event.createdAt, locale)}
                  </span>
                </>
              );

              return (
                <li key={event.id}>
                  {link ? (
                    <button
                      type="button"
                      onClick={() => handleOpen(link)}
                      className="flex w-full items-start gap-3 rounded-xl border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/50 sm:px-4"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex w-full items-start gap-3 rounded-xl border bg-card px-3 py-3 sm:px-4">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
