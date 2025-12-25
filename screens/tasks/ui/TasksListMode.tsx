'use client';

import { TaskCard } from "@/entities/task/ui/TaskCard";
import { Task } from "@/entities/task/model/types";

interface TasksListModeProps {
  tasks: Task[];
}

export function TasksListMode({ tasks }: TasksListModeProps) {
  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Задач пока нет</p>
      ) : (
        tasks.map(task => <TaskCard key={task.id} task={task} showGoalTitle />)
      )}
    </div>
  );
}