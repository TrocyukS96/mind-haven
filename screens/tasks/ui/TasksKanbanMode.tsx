'use client';

import type { Task } from '@/entities/task/model/types';
import { TaskKanbanBoard } from '@/features/task/ui/TaskKanbanBoard';
import { useStore } from '@/shared/store/store-config';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useTranslations } from 'next-intl';

interface TasksKanbanModeProps {
  tasks: Task[];
}

export function TasksKanbanMode({ tasks }: TasksKanbanModeProps) {
  const t = useTranslations('tasks');
  const projects = useStore((state) => state.projects);
  const goals = useStore((state) => state.goals);
  const [projectFilter, setProjectFilter] = useState('all');
  const [goalFilter, setGoalFilter] = useState('all');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder={t('columns.filterProject')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('columns.allProjects')}</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={goalFilter} onValueChange={setGoalFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder={t('columns.filterGoal')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('columns.allGoals')}</SelectItem>
            {goals.map((goal) => (
              <SelectItem key={goal.id} value={goal.id}>
                {goal.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <TaskKanbanBoard tasks={tasks} projectFilter={projectFilter} goalFilter={goalFilter} />
    </div>
  );
}
