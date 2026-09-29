'use client';

import type { Habit } from '@/entities/habit/model/types';
import { HabitDeleteButton } from '@/entities/habit/ui/HabitDeleteButton';
import { HabitEditButton } from '@/features/habit/ui/HabitEditButton';
import { HabitCalendarGrid } from '@/screens/habits/ui/HabitCalendarGrid';
import { parseHabitDate } from '@/shared/lib/habit/habit-date';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent } from '@/shared/ui/card';
import { Flame } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface HabitYearBoardProps {
  habits: Habit[];
  dates: string[];
  today: string;
  localeTag: string;
  frequencyLabel: (habit: Habit) => string;
}

function monthLabel(dateStr: string, localeTag: string) {
  const month = parseHabitDate(dateStr).toLocaleDateString(localeTag, { month: 'long' });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}`;
}

function groupDatesByMonth(dates: string[], localeTag: string) {
  const groups: { key: string; label: string; dates: string[] }[] = [];

  for (const dateStr of dates) {
    const date = parseHabitDate(dateStr);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label: monthLabel(dateStr, localeTag), dates: [dateStr] });
    } else {
      last.dates.push(dateStr);
    }
  }

  return groups;
}

export function HabitYearBoard({ habits, dates, today, localeTag, frequencyLabel }: HabitYearBoardProps) {
  const currentMonthRef = useRef<HTMLDivElement>(null);
  const months = groupDatesByMonth(dates, localeTag);
  const year = dates[0] ? parseHabitDate(dates[0]).getFullYear() : '';

  useEffect(() => {
    currentMonthRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, []);

  return (
    <div className="space-y-4">
      {habits.map((habit, habitIndex) => (
        <Card key={habit.id}>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium">{habit.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {frequencyLabel(habit)}
                  {year ? ` · ${year}` : ''}
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

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {months.map((month) => {
                const isCurrent = month.dates.includes(today);

                return (
                  <div
                    key={month.key}
                    ref={habitIndex === 0 && isCurrent ? currentMonthRef : undefined}
                    className={cn('min-w-0 rounded-lg p-3', isCurrent && 'bg-primary/5 ring-1 ring-primary/20')}
                  >
                    <p className={cn('mb-2 text-sm font-medium', isCurrent ? 'text-primary' : 'text-foreground')}>
                      {month.label}
                    </p>
                    <HabitCalendarGrid habit={habit} dates={month.dates} today={today} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
