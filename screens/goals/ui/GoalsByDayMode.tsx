'use client';

import type { Goal } from '@/entities/goal/model/types';
import GoalCard from './GoalCard';
import {
  format,
  isToday,
  isTomorrow,
  addDays,
  isWithinInterval,
  endOfWeek,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { getDateLocale } from '@/shared/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';

interface GoalsByDayModeProps {
  goals: Goal[];
}

type SectionKey = 'today' | 'tomorrow' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'later';

export function GoalsByDayMode({ goals }: GoalsByDayModeProps) {
  const t = useTranslations('goals');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const grouped = {
    today: goals.filter((goal) => isToday(new Date(goal.deadline))),
    tomorrow: goals.filter((goal) => isTomorrow(new Date(goal.deadline))),
    thisWeek: goals.filter((goal) =>
      isWithinInterval(new Date(goal.deadline), {
        start: startOfWeek(new Date(), { locale: dateLocale }),
        end: endOfWeek(new Date(), { locale: dateLocale }),
      })
    ),
    thisMonth: goals.filter((goal) =>
      isWithinInterval(new Date(goal.deadline), {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
      })
    ),
    thisYear: goals.filter((goal) =>
      isWithinInterval(new Date(goal.deadline), {
        start: startOfYear(new Date()),
        end: endOfYear(new Date()),
      })
    ),
    later: goals.filter(
      (goal) =>
        !isToday(new Date(goal.deadline)) &&
        !isTomorrow(new Date(goal.deadline)) &&
        new Date(goal.deadline) > addDays(new Date(), 1)
    ),
  };

  const sections: { key: SectionKey; items: Goal[]; dateLabel?: string }[] = [
    {
      key: 'today',
      items: grouped.today,
      dateLabel: format(new Date(), 'd MMMM', { locale: dateLocale }),
    },
    {
      key: 'tomorrow',
      items: grouped.tomorrow,
      dateLabel: format(addDays(new Date(), 1), 'd MMMM', { locale: dateLocale }),
    },
    { key: 'thisWeek', items: grouped.thisWeek },
    { key: 'thisMonth', items: grouped.thisMonth },
    { key: 'thisYear', items: grouped.thisYear },
    { key: 'later', items: grouped.later },
  ];

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <div key={section.key} className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t(`sections.${section.key}`)}
            {section.dateLabel && (
              <span className="text-muted-foreground text-base"> — {section.dateLabel}</span>
            )}{' '}
            ({section.items.length})
          </h2>
          {section.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">{t('noGoalsInSection')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {section.items.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
