'use client';

import { Target } from 'lucide-react';
import { EmptyState } from '@/shared/ui/empty-state';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface GoalEmptyStateProps {
  category?: string;
  compact?: boolean;
}

const GoalsEmptyState = ({ category, compact = false }: GoalEmptyStateProps) => {
  const openGoalForm = useStore((state) => state.openGoalForm);
  const t = useTranslations('goals');

  const title = category ? t('noGoalsInCategory', { category }) : t('noGoals');
  const description = category
    ? t('createGoalInCategory')
    : t('createFirstGoal');

  return (
    <EmptyState
      icon={Target}
      title={title}
      description={description}
      actionLabel={t('createGoal')}
      onAction={openGoalForm}
      compact={compact}
    />
  );
};

export default GoalsEmptyState;
