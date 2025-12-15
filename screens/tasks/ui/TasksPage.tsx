'use client';

import { Button } from "@/shared/ui/button";
import { Plus, Target, List, Kanban } from "lucide-react";
import { useStore } from "@/shared/store/store-config";
import { TaskCard } from "@/entities/task/ui/TaskCard";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";

type ViewMode = 'list' | 'kanban';

const TasksPage = () => {
  const { tasks, openTaskForm } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const todo = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-8">
      {/* Заголовок и переключатель */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Список дел</h1>
          <p className="text-muted-foreground mt-1">
            {todo.length} активных • {done.length} выполненных
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border bg-card p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Список
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-2"
            >
              <Kanban className="h-4 w-4" />
              Канбан
            </Button>
          </div>

          <Button onClick={() => openTaskForm()} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Новая задача
          </Button>
        </div>
      </div>

      {/* Список */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-20">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium">Задач пока нет</h3>
              <p className="text-muted-foreground">Создай первую задачу</p>
            </div>
          ) : (
            tasks.map(task => <TaskCard key={task.id} task={task} showGoalTitle />)
          )}
        </div>
      )}

      {/* Канбан */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* To Do */}
          <div className="rounded-xl border bg-card/50 p-4">
            <h3 className="font-semibold mb-4 text-lg">К выполнению ({todo.length})</h3>
            <div className="space-y-3">
              {todo.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Нет задач</p>
              ) : (
                todo.map(task => <TaskCard key={task.id} task={task} showGoalTitle />)
              )}
            </div>
          </div>

          {/* Done */}
          <div className="rounded-xl border bg-card/50 p-4">
            <h3 className="font-semibold mb-4 text-lg">Выполнено ({done.length})</h3>
            <div className="space-y-3">
              {done.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Нет выполненных задач</p>
              ) : (
                done.map(task => <TaskCard key={task.id} task={task} showGoalTitle />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;