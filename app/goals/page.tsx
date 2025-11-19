'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Plus, Target, Calendar, TrendingUp } from 'lucide-react';
import { useStore } from '@/shared/providers/store-provider';
import { CreateGoalForm } from '@/features/goal/create-goal/ui/create-goal-form';

export default function GoalsPage() {
  const { goals } = useStore();
  const [filter, setFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [isCreating, setIsCreating] = useState(false);

  const filteredGoals = filter === 'all' ? goals : goals.filter(g => g.category === filter);

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'hsl(var(--secondary))';
    if (progress >= 50) return '#f39c12';
    return 'hsl(var(--primary))';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>Цели</h1>
          <p className="text-muted-foreground mt-2">
            Ставь SMART-цели и отслеживай свой прогресс
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus size={20} />
          Создать цель
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Все цели
            </Button>
            <Button
              variant={filter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('week')}
            >
              Неделя
            </Button>
            <Button
              variant={filter === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('month')}
            >
              Месяц
            </Button>
            <Button
              variant={filter === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('year')}
            >
              Год
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Goal Form */}
      {isCreating && (
        <CreateGoalForm
          onCancel={() => setIsCreating(false)}
          onSuccess={() => setIsCreating(false)}
        />
      )}

      {/* Goals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGoals.map((goal) => (
          <Card key={goal.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="mb-2">{goal.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {goal.description}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                    <Target size={20} className="text-primary" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Прогресс</span>
                    <span className="text-sm font-medium">{goal.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${goal.progress}%`,
                        backgroundColor: getProgressColor(goal.progress),
                      }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={16} />
                    <span>{new Date(goal.deadline).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <TrendingUp size={16} />
                    Обновить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGoals.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Target size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="mb-2">Нет целей в этой категории</h3>
              <p className="text-muted-foreground mb-4">
                Создай свою первую цель, чтобы начать путь к успеху
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus size={20} />
                Создать цель
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
