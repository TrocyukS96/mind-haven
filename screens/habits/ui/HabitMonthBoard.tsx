'use client';

import type { Habit } from '@/entities/habit/model/types';
import { HabitDeleteButton } from '@/entities/habit/ui/HabitDeleteButton';
import { HabitEditButton } from '@/features/habit/ui/HabitEditButton';
import { HabitCalendarGrid } from '@/screens/habits/ui/HabitCalendarGrid';
import { parseHabitDate } from '@/shared/lib/habit/habit-date';
import { Card, CardContent } from '@/shared/ui/card';
import { Flame } from 'lucide-react';

interface HabitMonthBoardProps {
  habits: Habit[];
  dates: string[];
  today: string;
  localeTag: string;
  frequencyLabel: (habit: Habit) => string;
}

export function HabitMonthBoard({ habits, dates, today, localeTag, frequencyLabel }: HabitMonthBoardProps) {
  const monthTitle = dates[0]
    ? (() => {
        const date = parseHabitDate(dates[0]);
        const month = date.toLocaleDateString(localeTag, { month: 'long' });
        return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
      })()
    : '';

  return (
    <div className="space-y-4">
      {habits.map((habit) => (
        <Card key={habit.id}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium">{habit.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {frequencyLabel(habit)}
                  {monthTitle ? ` · ${monthTitle}` : ''}
                </p>
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

            <HabitCalendarGrid habit={habit} dates={dates} today={today} className="gap-2 sm:gap-3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
