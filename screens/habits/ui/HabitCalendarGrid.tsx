'use client';

import type { Habit } from '@/entities/habit/model/types';
import { HabitDayCell } from '@/features/habit/ui/HabitDayCell';
import { mondayOffset, parseHabitDate } from '@/shared/lib/habit/habit-date';
import { cn } from '@/shared/lib/utils';
import {
  HABIT_WEEKDAY_MESSAGE_KEY,
  HABIT_WEEKDAY_ORDER,
} from '@/shared/lib/habit/habit-weekdays';
import { useTranslations } from 'next-intl';

interface HabitCalendarGridProps {
  habit: Habit;
  dates: string[];
  today: string;
  className?: string;
}

export function HabitCalendarGrid({ habit, dates, today, className }: HabitCalendarGridProps) {
  const t = useTranslations('habits');
  const leadingDays = dates[0] ? mondayOffset(dates[0]) : 0;

  return (
    <div className={cn('grid w-full grid-cols-7 gap-1.5', className)}>
      {HABIT_WEEKDAY_ORDER.map((day) => (
        <div
          key={day}
          className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
        >
          {t(`weekdays.${HABIT_WEEKDAY_MESSAGE_KEY[day]}`)}
        </div>
      ))}
      {Array.from({ length: leadingDays }, (_, index) => (
        <div key={`pad-${index}`} />
      ))}
      {dates.map((dateStr) => {
        const isToday = dateStr === today;
        const dayNumber = parseHabitDate(dateStr).getDate();

        return (
          <div
            key={dateStr}
            className={cn('flex w-full flex-col items-stretch gap-1 rounded-md px-0.5 py-1', isToday && 'bg-primary/10')}
          >
            <span
              className={cn(
                'text-center text-[11px] tabular-nums',
                isToday ? 'font-semibold text-primary' : 'text-muted-foreground'
              )}
            >
              {dayNumber}
            </span>
            <HabitDayCell habit={habit} date={dateStr} today={today} fill />
          </div>
        );
      })}
    </div>
  );
}
