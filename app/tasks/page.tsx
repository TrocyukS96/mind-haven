'use client';

import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Badge } from '@/shared/ui/badge';
import { Plus, Calendar, Target, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { TaskCard } from '@/entities/task';

export default function TasksPage() {
  const {
    tasks,
    goals,
    toggleTask,
    deleteTask,
    openTaskForm,
  } = useStore();

  const goalsMap = Object.fromEntries(goals.map(g => [g.id, g.title]));

  // Сортировка: сначала невыполненные, потом выполненные
  //   const sortedTasks = [...tasks].sort((a, b) => {
  //     if (a.completed !== b.completed) {
  //       return a.completed ? 1 : -1;
  //     }
  //     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  //   });

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Список дел</h1>
          <p className="text-muted-foreground mt-1">
            Все задачи в одном месте — и повседневные, и шаги к целям
          </p>
        </div>

        <Button onClick={() => openTaskForm()} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Новая задача
        </Button>
      </div>

      {/* Список задач */}
      {tasks.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto w-24 h-24 bg-muted/40 rounded-full flex items-center justify-center mb-6">
            <Target className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium text-foreground/80">
            Задач пока нет
          </h3>
          <p className="text-muted-foreground mt-2">
            Создай первую задачу — и начни двигаться к своим целям
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} showGoalTitle />
          ))}
        </div>
      )}
    </div>
  );
}