'use client';

import { CreateHabitForm } from '@/features/habit/create-habit/ui/create-habit-form';
import { useStore } from '@/shared/providers/store-provider';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { CheckSquare, Flame, Plus, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export default function HabitsPage() {
  const { habits, toggleHabitDay } = useStore();
  const [isCreating, setIsCreating] = useState(false);

  const getDaysOfWeek = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const daysOfWeek = getDaysOfWeek();
  const today = new Date().toISOString().split('T')[0];

  const motivationalMessages = [
    'Ты на пути! Продолжай в том же духе! 🎯',
    'Отличная работа! Твоя дисциплина впечатляет! 💪',
    'Каждый день — это новая возможность стать лучше! ✨',
    'Привычки формируют характер. Ты создаёшь лучшую версию себя! 🌟',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>Привычки</h1>
          <p className="text-muted-foreground mt-2">
            Формируй полезные привычки каждый день
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus size={20} />
          Добавить привычку
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <CheckSquare size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Активных привычек</p>
                <p className="text-2xl font-semibold mt-1">{habits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-100">
                <Flame size={24} className="text-orange-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Лучшая серия</p>
                <p className="text-2xl font-semibold mt-1">
                  {Math.max(...habits.map(h => h.streak), 0)} дней
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <TrendingUp size={24} className="text-secondary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Выполнено сегодня</p>
                <p className="text-2xl font-semibold mt-1">
                  {habits.filter(h => h.completedDays.includes(today)).length}/{habits.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Motivation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🎉</div>
            <div>
              <h3 className="mb-2">Мотивация</h3>
              <p className="text-muted-foreground">
                {motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Habit Form */}
      {isCreating && (
        <CreateHabitForm
          onCancel={() => setIsCreating(false)}
          onSuccess={() => setIsCreating(false)}
        />
      )}

      {/* Habits Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>Трекер привычек</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-3 px-4 font-medium">Привычка</th>
                  <th className="text-center py-3 px-2 font-medium text-sm">Серия</th>
                  {daysOfWeek.map((date, index) => (
                    <th key={index} className="text-center py-3 px-2 font-medium text-sm">
                      <div>{date.toLocaleDateString('ru-RU', { weekday: 'short' })}</div>
                      <div className="text-xs text-muted-foreground">
                        {date.getDate()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => (
                  <tr key={habit.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium">{habit.name}</p>
                        <p className="text-sm text-muted-foreground">{habit.frequency}</p>
                      </div>
                    </td>
                    <td className="text-center py-4 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <Flame size={16} className="text-orange-500" />
                        <span className="font-medium">{habit.streak}</span>
                      </div>
                    </td>
                    {daysOfWeek.map((date, index) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const isCompleted = habit.completedDays.includes(dateStr);
                      const isToday = dateStr === today;
                      return (
                        <td key={index} className="text-center py-4 px-2">
                          <button
                            onClick={() => isToday && toggleHabitDay(habit.id, dateStr)}
                            disabled={!isToday}
                            className={`
                              w-8 h-8 rounded-lg border-2 transition-all
                              ${isCompleted
                                ? 'bg-secondary border-secondary text-white'
                                : 'border-border hover:border-primary'
                              }
                              ${isToday ? 'cursor-pointer' : 'cursor-default opacity-50'}
                            `}
                          >
                            {isCompleted && <CheckSquare size={20} className="mx-auto" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Habit Cards for Mobile */}
      <div className="lg:hidden space-y-4">
        {habits.map((habit) => {
          const isCompletedToday = habit.completedDays.includes(today);
          return (
            <Card key={habit.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="mb-1">{habit.name}</h3>
                      <p className="text-sm text-muted-foreground">{habit.frequency}</p>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 rounded-lg">
                      <Flame size={16} className="text-orange-500" />
                      <span className="font-medium">{habit.streak}</span>
                    </div>
                  </div>
                  <Button
                    variant={isCompletedToday ? 'outline' : 'default'}
                    className="w-full"
                    onClick={() => toggleHabitDay(habit.id, today)}
                  >
                    {isCompletedToday ? (
                      <>
                        <CheckSquare size={20} />
                        Выполнено сегодня
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Отметить выполнение
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
