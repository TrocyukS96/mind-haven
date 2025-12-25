'use client';

import { useStore } from "@/shared/store/store-config";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TasksByDayMode } from "./TasksByDayMode";
import { TasksCalendarMode } from "./TasksCalendarMode";
import { TasksListMode } from "./TasksListMode";
import { TasksTabs } from "./TasksTabs";
import { TasksSearch } from "./TasksSearch";
import { TasksFilter } from "./TasksFilter";
import { TaskPriority } from "@/entities/task/model/types";
import { useFilteredTasks } from "@/features/task/hooks/use-filtered-tasks";

type ViewMode = 'list' | 'by-day' | 'calendar';

type FilterState = {
  priority?: TaskPriority | 'all';
  overdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

const TasksPage = () => {
  const { tasks, openTaskForm } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('by-day');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterState>({ priority: 'all' });

  const filteredTasks = useFilteredTasks(tasks, searchQuery, filter);

  const isFilterActive = Object.values(filter).some(v => v !== undefined && v !== 'all');

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Список дел</h1>
        <Button onClick={() => openTaskForm()} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Новая задача
        </Button>
      </div>

      <div className="grid grid-cols-2 justify-between sm:flex-row gap-4">
        <div className="col-span-1 flex gap-2">
          <TasksFilter filter={filter} onApply={setFilter} onReset={() => setFilter({})} isActive={isFilterActive} />
          <TasksSearch value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="col-span-1 flex justify-end items-center">
          <TasksTabs viewMode={viewMode} setViewMode={setViewMode} />
        </div>
      </div>

      {viewMode === 'list' && (
        <TasksListMode tasks={filteredTasks} />
      )}

      {viewMode === 'by-day' && (
        <TasksByDayMode tasks={filteredTasks} />
      )}

      {viewMode === 'calendar' && (
        <TasksCalendarMode tasks={filteredTasks} />
      )}
    </div>
  );
};

export default TasksPage;