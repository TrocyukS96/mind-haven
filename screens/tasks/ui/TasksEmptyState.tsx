'use client';

import { useStore } from '@/shared/store/store-config';
import { EmptyState } from '@/shared/ui/empty-state';
import { CheckSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

const TasksEmptyState = () => {
  const openTaskForm = useStore((state) => state.openTaskForm);
  const t = useTranslations('tasks');

  return (
    <EmptyState
      icon={CheckSquare}
      title={t('noTasksYet')}
      description={t('createFirstTaskDescription')}
      actionLabel={t('createFirstTask')}
      onAction={openTaskForm}
      compact={true}
    />
  );
};

export default TasksEmptyState;
