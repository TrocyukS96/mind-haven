'use client';

import type { Task } from '@/entities/task/model/types';
import { TaskKanbanBoard } from '@/features/task/ui/TaskKanbanBoard';

interface TasksKanbanModeProps {
  tasks: Task[];
  onlyCurrentWeeks?: boolean;
  onShowAllWeeks?: () => void;
}

export function TasksKanbanMode({ tasks, onlyCurrentWeeks, onShowAllWeeks }: TasksKanbanModeProps) {
  return (
    <TaskKanbanBoard
      tasks={tasks}
      onlyCurrentWeeks={onlyCurrentWeeks}
      onShowAllWeeks={onShowAllWeeks}
    />
  );
}
