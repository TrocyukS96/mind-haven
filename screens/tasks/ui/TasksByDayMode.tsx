'use client';

import { Button } from '@/shared/ui/button';
import { Plus, Target } from 'lucide-react';
import { TaskCard } from '@/entities/task/ui/TaskCard';
import {
  format,
  isToday,
  isTomorrow,
  addDays,
  isWithinInterval,
  endOfWeek,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfMonth,
  addYears,
  endOfYear,
  isAfter,
} from 'date-fns';
import { Task } from '@/entities/task/model/types';
import { useStore } from '@/shared/store/store-config';
import { getDateLocale } from '@/shared/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';

interface TasksByDayModeProps {
  tasks: Task[];
}

type SectionKey =
  | 'today'
  | 'tomorrow'
  | 'afterTomorrow'
  | 'thisWeek'
  | 'thisMonth'
  | 'thisYear'
  | 'nextYear'
  | 'later'
  | 'backlog';

export function TasksByDayMode({ tasks }: TasksByDayModeProps) {
  const { openTaskForm } = useStore();
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const groupedTasks = {
    today: tasks.filter((task) => task.deadline && isToday(new Date(task.deadline))),
    tomorrow: tasks.filter((task) => task.deadline && isTomorrow(new Date(task.deadline))),
    afterTomorrow: tasks.filter(
      (task) => task.deadline && isAfter(new Date(task.deadline), addDays(new Date(), 2))
    ),
    thisWeek: tasks.filter(
      (task) =>
        task.deadline &&
        isWithinInterval(new Date(task.deadline), {
          start: startOfWeek(new Date(), { locale: dateLocale }),
          end: endOfWeek(new Date(), { locale: dateLocale }),
        })
    ),
    thisMonth: tasks.filter(
      (task) =>
        task.deadline &&
        isWithinInterval(new Date(task.deadline), {
          start: startOfMonth(new Date()),
          end: endOfMonth(new Date()),
        })
    ),
    thisYear: tasks.filter(
      (task) =>
        task.deadline &&
        isWithinInterval(new Date(task.deadline), {
          start: startOfYear(new Date()),
          end: endOfYear(new Date()),
        })
    ),
    nextYear: tasks.filter(
      (task) =>
        task.deadline &&
        isWithinInterval(new Date(task.deadline), {
          start: addYears(new Date(), 1),
          end: addYears(new Date(), 1),
        })
    ),
    later: tasks.filter(
      (task) =>
        task.deadline &&
        !isToday(new Date(task.deadline)) &&
        !isTomorrow(new Date(task.deadline)) &&
        !isAfter(new Date(task.deadline), addDays(new Date(), 2))
    ),
    backlog: tasks.filter((task) => !task.deadline),
  };

  const formatDateForSection = (sectionKey: SectionKey) => {
    switch (sectionKey) {
      case 'today':
        return format(new Date(), 'yyyy-MM-dd');
      case 'tomorrow':
        return format(addDays(new Date(), 1), 'yyyy-MM-dd');
      case 'thisWeek':
        return format(endOfWeek(new Date(), { locale: dateLocale }), 'yyyy-MM-dd');
      case 'afterTomorrow':
        return format(addDays(new Date(), 2), 'yyyy-MM-dd');
      case 'thisMonth':
        return format(endOfMonth(new Date()), 'yyyy-MM-dd');
      case 'thisYear':
        return format(endOfYear(new Date()), 'yyyy-MM-dd');
      case 'nextYear':
        return format(addYears(new Date(), 1), 'yyyy-MM-dd');
      case 'later':
        return format(endOfWeek(new Date(), { locale: dateLocale }), 'yyyy-MM-dd');
      case 'backlog':
        return undefined;
      default:
        return undefined;
    }
  };

  const sections: {
    key: SectionKey;
    tasks: Task[];
    dateLabel?: string;
  }[] = [
    {
      key: 'today',
      tasks: groupedTasks.today,
      dateLabel: format(new Date(), 'd MMMM', { locale: dateLocale }),
    },
    {
      key: 'tomorrow',
      tasks: groupedTasks.tomorrow,
      dateLabel: format(addDays(new Date(), 1), 'd MMMM', { locale: dateLocale }),
    },
    {
      key: 'afterTomorrow',
      tasks: groupedTasks.afterTomorrow,
      dateLabel: format(addDays(new Date(), 2), 'd MMMM', { locale: dateLocale }),
    },
    {
      key: 'thisWeek',
      tasks: groupedTasks.thisWeek,
      dateLabel: format(addDays(new Date(), 2), 'd MMMM', { locale: dateLocale }),
    },
    {
      key: 'thisMonth',
      tasks: groupedTasks.thisMonth,
      dateLabel: format(endOfMonth(new Date()), 'd MMMM', { locale: dateLocale }),
    },
    {
      key: 'thisYear',
      tasks: groupedTasks.thisYear,
      dateLabel: format(endOfYear(new Date()), 'd MMMM', { locale: dateLocale }),
    },
    { key: 'nextYear', tasks: groupedTasks.nextYear, dateLabel: '' },
    { key: 'later', tasks: groupedTasks.later, dateLabel: '' },
    { key: 'backlog', tasks: groupedTasks.backlog },
  ];

  const DaySection = ({
    sectionKey,
    dayTasks,
    dateLabel,
  }: {
    sectionKey: SectionKey;
    dayTasks: Task[];
    dateLabel?: string;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {t(`sections.${sectionKey}`)}{' '}
          {dateLabel && (
            <span className="text-muted-foreground text-base">— {dateLabel}</span>
          )}{' '}
          ({dayTasks.length})
        </h2>
        <Button
          size="sm"
          onClick={() =>
            openTaskForm(undefined, undefined, formatDateForSection(sectionKey))
          }
        >
          <Plus className="h-4 w-4 mr-1" />
          {tCommon('add')}
        </Button>
      </div>

      {dayTasks.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl">
          <Target className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{tCommon('noTasks')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dayTasks.map((task) => (
            <div
              key={task.id}
              className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <TaskCard task={task} showGoalTitle />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-12">
      {sections.map((section) => (
        <DaySection
          key={section.key}
          sectionKey={section.key}
          dayTasks={section.tasks}
          dateLabel={section.dateLabel}
        />
      ))}
    </div>
  );
}
