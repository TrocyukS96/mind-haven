'use client';

import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Badge } from '@/shared/ui/badge';
import { Plus, Calendar, Target, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

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
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-4 p-5 rounded-xl border bg-card hover:shadow-md transition-all",
                task.completed && "opacity-70"
              )}
            >
              {/* Чекбокс */}
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
                className="h-5 w-5"
              />

              {/* Контент */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-medium text-base",
                    task.completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {task.goalId && (
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      <span className="truncate max-w-xs">
                        {goalsMap[task.goalId] || 'Цель удалена'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>

              {/* Приоритет */}
              <Badge
                variant={
                  task.priority === 'urgent'
                    ? 'destructive'
                    : task.priority === 'high'
                    ? 'default'
                    : 'secondary'
                }
                className="shrink-0"
              >
                {task.priority === 'low' && 'Низкий'}
                {task.priority === 'medium' && 'Средний'}
                {task.priority === 'high' && 'Высокий'}
                {task.priority === 'urgent' && 'Срочно'}
              </Badge>

              {/* Действия */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openTaskForm(task)}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteTask(task.id)}
                  className="h-8 w-8 text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}