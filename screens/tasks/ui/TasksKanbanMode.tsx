'use client';

import { TaskCard } from '@/entities/task/ui/TaskCard';
import type { Task } from '@/entities/task/model/types';
import { KanbanBoard } from '@/shared/ui/kanban-board';
import { useTranslations } from 'next-intl';

interface TasksKanbanModeProps {
  tasks: Task[];
}

export function TasksKanbanMode({ tasks }: TasksKanbanModeProps) {
  const t = useTranslations('tasks');

  return (
    <KanbanBoard
      section="tasks"
      items={tasks}
      getItemType={(task) => task.type}
      renderItem={(task) => (
        <TaskCard key={task.id} task={task} showGoalTitle showType={false} />
      )}
      emptyMessage={t('noTasksYet')}
    />
  );
}
