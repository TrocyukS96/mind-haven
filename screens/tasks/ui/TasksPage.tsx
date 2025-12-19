// app/tasks/page.tsx
'use client';

import { Button } from "@/shared/ui/button";
import { Plus, Target } from "lucide-react";
import { useStore } from "@/shared/store/store-config";
import { TaskCard } from "@/entities/task/ui/TaskCard";
import { format, isToday, isTomorrow, addDays, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { useMemo, useState } from "react";
import TasksEmptyState from "./TasksEmptyState";
import { Task } from "@/entities/task/model/types";

type ViewMode = 'list' | 'by-day';

const TasksPage = () => {
  const { tasks, openTaskForm } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const tasksByDay = useMemo(() => {
    const groups = {
      today: [] as Task[],
      tomorrow: [] as Task[],
      thisWeek: [] as Task[],
      later: [] as Task[],
      backlog: [] as Task[],
    };

    tasks.forEach((task) => {
      if (!task.deadline) {
        groups.backlog.push(task);
        return;
      }

      const date = new Date(task.deadline);
      if (isToday(date)) groups.today.push(task);
      else if (isTomorrow(date)) groups.tomorrow.push(task);
      else if (isWithinInterval(date, { start: addDays(new Date(), 2), end: endOfWeek(new Date()) })) groups.thisWeek.push(task);
      else groups.later.push(task);
    });

    return groups;
  }, [tasks]);

  const DaySection = ({ title, tasks, dateLabel }: { title: string; tasks: Task[]; dateLabel?: string }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {title} {dateLabel && <span className="text-muted-foreground text-base">— {dateLabel}</span>} ({tasks.length})
        </h2>
        <Button size="sm" onClick={() => openTaskForm()}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl">
          <Target className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Нет задач</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow p-4">
              <TaskCard task={task} showGoalTitle />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Список дел</h1>
        <Button onClick={() => openTaskForm()} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Новая задача
        </Button>
      </div>

      <div className="flex rounded-lg border bg-card p-1 w-max">
        <Button variant={viewMode === 'list' ? 'default' : 'ghost'} onClick={() => setViewMode('list')}>
          Список
        </Button>
        <Button variant={viewMode === 'by-day' ? 'default' : 'ghost'} onClick={() => setViewMode('by-day')}>
          По дням
        </Button>
      </div>

      {viewMode === 'list' && (
        <div className="space-y-3">
          {tasks.length === 0 ? <TasksEmptyState /> : tasks.map(task => <TaskCard key={task.id} task={task} showGoalTitle />)}
        </div>
      )}

      {viewMode === 'by-day' && (
        <div className="space-y-12">
          <DaySection
            title="Сегодня"
            tasks={tasksByDay.today}
            dateLabel={format(new Date(), 'd MMMM', { locale: ru })}
          />
          <DaySection
            title="Завтра"
            tasks={tasksByDay.tomorrow}
            dateLabel={format(addDays(new Date(), 1), 'd MMMM', { locale: ru })}
          />
          <DaySection title="На этой неделе" tasks={tasksByDay.thisWeek} />
          <DaySection title="Позже" tasks={tasksByDay.later} />
          <DaySection title="Бэклог (без срока)" tasks={tasksByDay.backlog} />
        </div>
      )}
    </div>
  );
};

export default TasksPage;