'use client';

import { Target } from 'lucide-react';
import { EmptyState } from '@/shared/ui/empty-state';
import { useStore } from '@/shared/store/store-config';

interface GoalEmptyStateProps {
  category?: string;
  compact?: boolean;
}

const GoalsEmptyState = ({ category, compact = false }: GoalEmptyStateProps) => {
  const openGoalForm = useStore((state) => state.openGoalForm);

  const title = category 
    ? `Нет целей в категории "${category}"`
    : 'Нет целей';

  const description = category
    ? 'Создайте цель в этой категории, чтобы начать работу'
    : 'Создайте свою первую цель, чтобы начать путь к успеху';

  return (
    <EmptyState
      icon={Target}
      title={title}
      description={description}
      actionLabel="Создать цель"
      onAction={openGoalForm}
      compact={compact}
    />
  );
};

export default GoalsEmptyState;