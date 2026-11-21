'use client';

import { Button } from '@/shared/ui/button';
import { Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { TaskPriority } from '@/entities/task/model/types';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useStore } from '@/shared/store/store-config';
import { DEFAULT_TASK_LIST_FILTER, type TaskListFilter } from '@/features/task/hooks/use-filtered-tasks';

interface TasksFilterProps {
  filter: TaskListFilter;
  onApply: (filter: TaskListFilter) => void;
  onReset: () => void;
  isActive: boolean;
}

const CLEARED_FILTER: TaskListFilter = {
  ...DEFAULT_TASK_LIST_FILTER,
  projectId: 'all',
  goalId: 'all',
  weeks: 'all',
  overdue: false,
  dateFrom: '',
  dateTo: '',
};

export function TasksFilter({ filter, onApply, onReset, isActive }: TasksFilterProps) {
  const [temp, setTemp] = useState<TaskListFilter>(filter);
  const [open, setOpen] = useState(false);
  const projects = useStore((state) => state.projects);
  const goals = useStore((state) => state.goals);
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const tPriorities = useTranslations('priorities');

  const handleOpenChange = (next: boolean) => {
    if (next) setTemp(filter);
    setOpen(next);
  };

  const handleApply = () => {
    onApply(temp);
    setOpen(false);
  };

  const handleReset = () => {
    setTemp(CLEARED_FILTER);
    onReset();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-9 w-9', isActive && 'text-primary bg-primary/10')}
          aria-label={t('priority')}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[min(32rem,var(--radix-popover-content-available-height))] w-80 space-y-4 overflow-y-auto p-4"
      >
        <div className="space-y-2">
          <Label>{t('priority')}</Label>
          <Select
            value={temp.priority || 'all'}
            onValueChange={(value) => setTemp({ ...temp, priority: value as TaskPriority | 'all' })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('all')}</SelectItem>
              <SelectItem value="low">{tPriorities('low')}</SelectItem>
              <SelectItem value="medium">{tPriorities('medium')}</SelectItem>
              <SelectItem value="high">{tPriorities('high')}</SelectItem>
              <SelectItem value="urgent">{tPriorities('urgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('columns.filterProject')}</Label>
          <Select
            value={temp.projectId || 'all'}
            onValueChange={(value) => setTemp({ ...temp, projectId: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('columns.allProjects')} />
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
        </div>

        <div className="space-y-2">
          <Label>{t('columns.filterGoal')}</Label>
          <Select
            value={temp.goalId || 'all'}
            onValueChange={(value) => setTemp({ ...temp, goalId: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('columns.allGoals')} />
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

        <div className="space-y-2">
          <Label>{t('columns.weeks')}</Label>
          <Select
            value={temp.weeks || 'all'}
            onValueChange={(value) => setTemp({ ...temp, weeks: value as TaskListFilter['weeks'] })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('columns.allWeeks')}</SelectItem>
              <SelectItem value="current">{t('columns.currentWeeksOnly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="tasks-hide-completed"
            checked={temp.hideCompleted !== false}
            onCheckedChange={(checked) => setTemp({ ...temp, hideCompleted: checked === true })}
          />
          <Label htmlFor="tasks-hide-completed" className="cursor-pointer">
            {t('hideCompleted')}
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="tasks-overdue"
            checked={temp.overdue || false}
            onCheckedChange={(checked) => setTemp({ ...temp, overdue: checked === true })}
          />
          <Label htmlFor="tasks-overdue" className="cursor-pointer">
            {t('overdue')}
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{tCommon('from')}</Label>
            <Input
              type="date"
              value={temp.dateFrom || ''}
              onChange={(event) => setTemp({ ...temp, dateFrom: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{tCommon('to')}</Label>
            <Input
              type="date"
              value={temp.dateTo || ''}
              onChange={(event) => setTemp({ ...temp, dateTo: event.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            {tCommon('reset')}
          </Button>
          <Button onClick={handleApply}>{tCommon('apply')}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
