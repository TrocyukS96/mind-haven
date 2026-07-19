'use client';

import { useStore } from '@/shared/store/store-config';
import { TaskCard } from '@/entities/task/ui/TaskCard';
import { Button } from '@/shared/ui/button';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { Task } from '@/entities/task/model/types';
import { getDateLocale } from '@/shared/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';

interface TasksCalendarModeProps {
  tasks: Task[];
}

export const TasksCalendarMode = ({ tasks }: TasksCalendarModeProps) => {
  const { openTaskForm } = useStore();
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const dailyTasks = tasks.reduce(
    (acc, task) => {
      if (task.deadline) {
        const day = task.deadline.split('T')[0];
        if (!acc[day]) acc[day] = [];
        acc[day].push(task.id);
      }
      return acc;
    },
    {} as Record<string, string[]>
  );

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleMonthChange = (value: string) => {
    setCurrentMonth(new Date(year, parseInt(value), 1));
  };

  const handleYearChange = (value: string) => {
    setCurrentMonth(new Date(parseInt(value), monthIndex, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsDayModalOpen(true);
  };

  const dayTasks = selectedDate
    ? dailyTasks[format(selectedDate, 'yyyy-MM-dd')]
        ?.map((id) => tasks.find((task) => task.id === id))
        .filter(Boolean) || []
    : [];

  const getTaskCount = (date: Date) =>
    dailyTasks[format(date, 'yyyy-MM-dd')]?.length || 0;

  const weekdayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

  return (
    <>
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Select value={monthIndex.toString()} onValueChange={handleMonthChange}>
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

            <Select value={year.toString()} onValueChange={handleYearChange}>
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

          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
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
            const taskCount = getTaskCount(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'min-h-32 rounded-xl border bg-card p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
                  isCurrentDay && 'ring-2 ring-primary ring-offset-2',
                  taskCount > 0 && 'border-primary/30'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn('text-sm font-semibold', isCurrentDay && 'text-primary')}
                  >
                    {format(day, 'd')}
                  </span>
                  {taskCount > 0 && (
                    <div className="text-xs font-medium text-primary">{taskCount}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('taskCount', { count: taskCount })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate &&
                t('tasksOnDate', {
                  date: format(selectedDate, 'd MMMM yyyy', { locale: dateLocale }),
                })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {dayTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {tCommon('noTasks')}
              </p>
            ) : (
              dayTasks.map(
                (task) => task && <TaskCard key={task.id} task={task} showGoalTitle />
              )
            )}
          </div>
          <Button
            className="w-full mt-6"
            onClick={() =>
              openTaskForm(
                undefined,
                undefined,
                selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('addTask')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
