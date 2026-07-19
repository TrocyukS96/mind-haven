'use client';

import GoalCard from './GoalCard';
import type { Goal } from '@/entities/goal/model/types';
import { KanbanBoard } from '@/shared/ui/kanban-board';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface GoalsKanbanModeProps {
  goals: Goal[];
}

export function GoalsKanbanMode({ goals }: GoalsKanbanModeProps) {
  const t = useTranslations('goals');
  const goalsKanbanColumnOrder = useStore((state) => state.goalsKanbanColumnOrder);
  const reorderGoalsKanbanColumns = useStore((state) => state.reorderGoalsKanbanColumns);
  const moveGoalInKanban = useStore((state) => state.moveGoalInKanban);

  return (
    <KanbanBoard
      section="goals"
      items={goals}
      getItemType={(goal) => goal.type}
      renderItem={(goal) => <GoalCard key={goal.id} goal={goal} showType={false} />}
      emptyMessage={t('noGoals')}
      draggable
      columnOrder={goalsKanbanColumnOrder}
      onColumnReorder={reorderGoalsKanbanColumns}
      onItemMove={moveGoalInKanban}
    />
  );
}
