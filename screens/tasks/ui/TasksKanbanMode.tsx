'use client';

import { TaskCard } from '@/entities/task/ui/TaskCard';
import type { Task } from '@/entities/task/model/types';
import { KanbanBoard } from '@/shared/ui/kanban-board';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface TasksKanbanModeProps {
  tasks: Task[];
}

export function TasksKanbanMode({ tasks }: TasksKanbanModeProps) {
  const t = useTranslations('tasks');
  const tasksKanbanColumnOrder = useStore((state) => state.tasksKanbanColumnOrder);
  const reorderTasksKanbanColumns = useStore((state) => state.reorderTasksKanbanColumns);
  const moveTaskInKanban = useStore((state) => state.moveTaskInKanban);

  return (
    <KanbanBoard
      section="tasks"
      items={tasks}
      getItemType={(task) => task.type}
      renderItem={(task) => (
        <TaskCard key={task.id} task={task} showGoalTitle showType={false} />
      )}
      emptyMessage={t('noTasksYet')}
      draggable
      columnOrder={tasksKanbanColumnOrder}
      onColumnReorder={reorderTasksKanbanColumns}
      onItemMove={moveTaskInKanban}
    />
  );
}
