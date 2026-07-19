'use client';

import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import GoalsFilter from './GoalsFilter';
import GoalsSearch from './GoalsSearch';
import GoalsList from './GoalsList';
import GoalsEmptyState from './GoalsEmtyState';
import { GoalsKanbanMode } from './GoalsKanbanMode';
import { GoalsByDayMode } from './GoalsByDayMode';
import { GoalsCalendarMode } from './GoalsCalendarMode';
import { GoalCategory } from '@/entities/goal/model/types';
import { useTranslations } from 'next-intl';
import type { DisplayMode } from '@/shared/config/display-modes';
import { PageToolbar } from '@/shared/ui/page-toolbar';
import { DisplayModeTabs } from '@/shared/ui/display-mode-tabs';
import { useDisplayModeSettings, resolveDisplayMode } from '@/features/display-modes';

const GoalsPage = () => {
  const { goals } = useStore();
  const openGoalForm = useStore((state) => state.openGoalForm);
  const { settings, getDefaultMode } = useDisplayModeSettings();
  const t = useTranslations('goals');

  const [filter, setFilter] = useState<GoalCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => getDefaultMode('goals'));

  useEffect(() => {
    setDisplayMode((current) => resolveDisplayMode('goals', current, settings));
  }, [settings]);

  const filteredGoals = useMemo(() => {
    let result = goals;

    if (filter !== 'all') {
      result = result.filter((g) => g.category === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (goal) =>
          goal.title.toLowerCase().includes(query) ||
          (goal.description?.toLowerCase().includes(query) ?? false)
      );
    }

    return result;
  }, [goals, filter, searchQuery]);

  const renderContent = () => {
    switch (displayMode) {
      case 'kanban':
        return <GoalsKanbanMode goals={filteredGoals} />;
      case 'list':
        return <GoalsList filteredGoals={filteredGoals} />;
      case 'by-day':
        return <GoalsByDayMode goals={filteredGoals} />;
      case 'calendar':
        return <GoalsCalendarMode goals={filteredGoals} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>

        <Button onClick={() => openGoalForm()} size="lg" className="shrink-0">
          <Plus className="mr-2 h-5 w-5" />
          {t('createGoal')}
        </Button>
      </div>

      <PageToolbar
        left={
          <>
            <GoalsFilter activeFilter={filter} setFilter={setFilter} compact />
            <GoalsSearch value={searchQuery} onChange={setSearchQuery} />
          </>
        }
        right={
          <DisplayModeTabs
            section="goals"
            value={displayMode}
            onChange={setDisplayMode}
          />
        }
      />

      {filteredGoals.length === 0 ? (
        <GoalsEmptyState />
      ) : (
        renderContent()
      )}
    </div>
  );
};

export default GoalsPage;
