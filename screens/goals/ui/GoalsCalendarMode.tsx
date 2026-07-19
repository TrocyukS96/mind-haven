'use client';

import type { Goal } from '@/entities/goal/model/types';
import GoalCard from './GoalCard';
import { Button } from '@/shared/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
} from 'date-fns';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { cn } from '@/shared/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { getDateLocale } from '@/shared/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';

interface GoalsCalendarModeProps {
  goals: Goal[];
}

export function GoalsCalendarMode({ goals }: GoalsCalendarModeProps) {
  const t = useTranslations('goals');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const goalsByDay = goals.reduce(
    (acc, goal) => {
      const day = goal.deadline.split('T')[0];
      if (!acc[day]) acc[day] = [];
      acc[day].push(goal);
      return acc;
    },
    {} as Record<string, Goal[]>
  );

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const weekdayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

  const dayGoals = selectedDate
    ? goalsByDay[format(selectedDate, 'yyyy-MM-dd')] ?? []
    : [];

  const getGoalCount = (date: Date) =>
    goalsByDay[format(date, 'yyyy-MM-dd')]?.length || 0;

  return (
    <>
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Select
              value={monthIndex.toString()}
              onValueChange={(value) => setCurrentMonth(new Date(year, parseInt(value), 1))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {t(`months.${i}` as 'months.0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={year.toString()}
              onValueChange={(value) =>
                setCurrentMonth(new Date(parseInt(value), monthIndex, 1))
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => year - 5 + i).map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground mb-2">
          {weekdayKeys.map((key) => (
            <div key={key}>{t(`weekdays.${key}`)}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {days.map((day) => {
            const goalCount = getGoalCount(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toString()}
                onClick={() => {
                  setSelectedDate(day);
                  setIsDayModalOpen(true);
                }}
                className={cn(
                  'min-h-32 rounded-xl border bg-card p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
                  isCurrentDay && 'ring-2 ring-primary ring-offset-2',
                  goalCount > 0 && 'border-primary/30'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-sm font-semibold', isCurrentDay && 'text-primary')}>
                    {format(day, 'd')}
                  </span>
                  {goalCount > 0 && (
                    <div className="text-xs font-medium text-primary">{goalCount}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('goalCount', { count: goalCount })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate &&
                t('goalsOnDate', {
                  date: format(selectedDate, 'd MMMM yyyy', { locale: dateLocale }),
                })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {dayGoals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('noGoalsInSection')}</p>
            ) : (
              dayGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
