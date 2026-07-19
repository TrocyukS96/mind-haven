'use client';

import GoalCard from './GoalCard';
import type { Goal } from '@/entities/goal/model/types';
import { KanbanBoard } from '@/shared/ui/kanban-board';
import { useTranslations } from 'next-intl';

interface GoalsKanbanModeProps {
  goals: Goal[];
}

export function GoalsKanbanMode({ goals }: GoalsKanbanModeProps) {
  const t = useTranslations('goals');

  return (
    <KanbanBoard
      section="goals"
      items={goals}
      getItemType={(goal) => goal.type}
      renderItem={(goal) => <GoalCard key={goal.id} goal={goal} />}
      emptyMessage={t('noGoals')}
    />
  );
}
