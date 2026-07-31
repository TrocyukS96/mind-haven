'use client';

import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TasksByDayMode } from './TasksByDayMode';
import { TasksCalendarMode } from './TasksCalendarMode';
import { TasksListMode } from './TasksListMode';
import { TasksKanbanMode } from './TasksKanbanMode';
import { TasksSearch } from './TasksSearch';
import { TasksFilter } from './TasksFilter';
import { TaskVoiceButton } from '@/features/task/ui/TaskVoiceButton';
import { TaskPriority } from '@/entities/task/model/types';
import { useFilteredTasks } from '@/features/task/hooks/use-filtered-tasks';
import { useTranslations } from 'next-intl';
import type { DisplayMode } from '@/shared/config/display-modes';
import { PageToolbar } from '@/shared/ui/page-toolbar';
import { DisplayModeTabs } from '@/shared/ui/display-mode-tabs';
import { useDisplayModeSettings, resolveDisplayMode } from '@/features/display-modes';

type FilterState = {
  priority?: TaskPriority | 'all';
  overdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

const TasksPage = () => {
  const { tasks, openTaskForm } = useStore();
  const { settings, getDefaultMode } = useDisplayModeSettings();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => getDefaultMode('tasks'));
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterState>({ priority: 'all' });
  const t = useTranslations('tasks');

  useEffect(() => {
    setDisplayMode((current) => resolveDisplayMode('tasks', current, settings));
  }, [settings]);

  const filteredTasks = useFilteredTasks(tasks, searchQuery, filter);

  const isFilterActive = Object.values(filter).some(
    (v) => v !== undefined && v !== 'all'
  );

  const renderContent = () => {
    switch (displayMode) {
      case 'kanban':
        return <TasksKanbanMode tasks={filteredTasks} />;
      case 'list':
        return <TasksListMode tasks={filteredTasks} />;
      case 'by-day':
        return <TasksByDayMode tasks={filteredTasks} />;
      case 'calendar':
        return <TasksCalendarMode tasks={filteredTasks} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <div className="flex items-center gap-3">
          <TaskVoiceButton />
          <Button onClick={() => openTaskForm()} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            {t('newTask')}
          </Button>
        </div>
      </div>

      <PageToolbar
        left={
          <>
            <TasksFilter
              filter={filter}
              onApply={setFilter}
              onReset={() => setFilter({})}
              isActive={isFilterActive}
            />
            <TasksSearch value={searchQuery} onChange={setSearchQuery} />
          </>
        }
        right={
          <DisplayModeTabs
            section="tasks"
            value={displayMode}
            onChange={setDisplayMode}
          />
        }
      />

      {renderContent()}
    </div>
  );
};

export default TasksPage;
