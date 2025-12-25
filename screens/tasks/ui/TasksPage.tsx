'use client';

import { useStore } from "@/shared/store/store-config";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TasksByDayMode } from "./TasksByDayMode";
import { TasksCalendarMode } from "./TasksCalendarMode";
import { TasksListMode } from "./TasksListMode";

type ViewMode = 'list' | 'by-day' | 'calendar';

const TasksPage = () => {
  const { tasks, openTaskForm } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('by-day');
  return (
    <div className="max-w-7xl mx-auto space-y-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Список дел</h1>
        <Button onClick={() => openTaskForm()} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Новая задача
        </Button>
      </div>

      <div className="flex rounded-lg border bg-card p-1 w-max">
        <Button variant={viewMode === 'by-day' ? 'default' : 'ghost'} onClick={() => setViewMode('by-day')}>
          По дням
        </Button>
        <Button variant={viewMode === 'calendar' ? 'default' : 'ghost'} onClick={() => setViewMode('calendar')}>
          Календарь
        </Button>
        <Button variant={viewMode === 'list' ? 'default' : 'ghost'} onClick={() => setViewMode('list')}>
          Список
        </Button>
      </div>

      {viewMode === 'list' && (
        <TasksListMode tasks={tasks} />
      )}

      {viewMode === 'by-day' && (
        <TasksByDayMode tasks={tasks} />
      )}

      {viewMode === 'calendar' && (
        <TasksCalendarMode />
      )}
    </div>
  );
};

export default TasksPage;