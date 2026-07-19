'use client';

import { TaskCard } from '@/entities/task/ui/TaskCard';
import { Task } from '@/entities/task/model/types';
import { useTranslations } from 'next-intl';

interface TasksListModeProps {
  tasks: Task[];
}

export function TasksListMode({ tasks }: TasksListModeProps) {
  const t = useTranslations('tasks');

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">{t('noTasksYet')}</p>
      ) : (
        tasks.map((task) => <TaskCard key={task.id} task={task} showGoalTitle />)
      )}
    </div>
  );
}
