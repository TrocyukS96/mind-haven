'use client';

import { Task } from '../model/types';
import { Checkbox } from '@/shared/ui/checkbox';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Calendar, Edit, MoreVertical, Trash2, Brain } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { toast } from 'react-toastify';
import { useStore } from '@/shared/store/store-config';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { useLocale, useTranslations } from 'next-intl';
import { ItemTypeBadge } from '@/shared/ui/item-type-badge';
import { getTaskPriorityStyle } from '../lib/get-task-priority-style';

interface TaskCardProps {
  task: Task;
  showGoalTitle?: boolean;
  showType?: boolean;
  variant?: 'default' | 'step';
}

export function TaskCard({
  task,
  showGoalTitle = false,
  showType = true,
  variant = 'default',
}: TaskCardProps) {
  const { toggleTask, deleteTask, openTaskForm, goals } = useStore();
  const goal = goals.find((g) => g.id === task.goalId);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const tPriorities = useTranslations('priorities');
  const locale = useLocale();

  const handleDeleteTask = () => {
    deleteTask(task);
    toast.success(t('taskDeleted'));
    setIsDeleteOpen(false);
  };

  const isStep = variant === 'step';
  const priorityStyle = getTaskPriorityStyle(task.priority);

  const priorityLabels: Record<Task['priority'], string> = {
    low: tPriorities('low'),
    medium: tPriorities('medium'),
    high: tPriorities('high'),
    urgent: tPriorities('urgent'),
  };

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const deadlineRow = formattedDeadline ? (
    <div
      className={cn(
        'flex items-center gap-1.5',
        isStep ? 'text-[11px]' : 'text-xs',
        task.overdue && !task.completed ? 'text-destructive' : 'text-muted-foreground'
      )}
    >
      <Calendar size={isStep ? 12 : 14} className="shrink-0" />
      <span className={cn(isStep && 'truncate')}>
        {tCommon('deadline')}: {formattedDeadline}
        {task.overdue && !task.completed && !isStep && ` · ${t('overdueBadge')}`}
      </span>
    </div>
  ) : null;

  const priorityBadge = (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-medium',
        isStep ? 'text-[10px]' : 'text-xs',
        priorityStyle.badge,
        task.completed && 'opacity-60'
      )}
    >
      {priorityLabels[task.priority]}
    </span>
  );

  const cardContent = (
    <>
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => toggleTask(task.id)}
        className={cn('h-4 w-4 shrink-0 cursor-pointer', isStep && 'ml-1.5', !isStep && 'mt-0.5')}
      />

      <div className={cn('min-w-0 flex-1', !isStep && 'space-y-1')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className={cn('flex flex-wrap items-center gap-2', !isStep && 'gap-x-2 gap-y-1')}>
              <span
                className={cn(
                  isStep ? 'text-sm' : 'text-base font-semibold leading-snug',
                  'min-w-0 flex-1',
                  isStep && 'truncate',
                  task.completed && 'line-through text-muted-foreground'
                )}
              >
                {task.title}
              </span>

              {!isStep && showType && (
                <ItemTypeBadge
                  section="tasks"
                  typeKey={task.type}
                  className="shrink-0 text-xs font-normal"
                />
              )}
            </div>

            {deadlineRow && (
              <div className={cn(!isStep && 'mt-1')}>{deadlineRow}</div>
            )}

            {!isStep && showGoalTitle && goal && (
              <p className="mt-1 break-words text-xs text-muted-foreground">
                {t('linkedToGoal', { goal: goal.title })}
              </p>
            )}
          </div>

          <div className={cn('flex shrink-0 items-center gap-1', isStep && 'self-start')}>
            {isStep && priorityBadge}

            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('shrink-0 cursor-pointer', isStep ? 'h-7 w-7' : 'h-8 w-8')}
              >
                <MoreVertical className={isStep ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openTaskForm(task)}>
                <Edit className="mr-2 h-4 w-4" />
                {tCommon('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tCommon('delete')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.info(t('analyzeSoon'), {
                    icon: <Brain className="h-4 w-4" />,
                  })
                }
              >
                <Brain className="mr-2 h-4 w-4" />
                {tCommon('analyze')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {isStep ? (
        <div
          className={cn(
            'group relative flex w-full items-center gap-2 rounded-lg py-1 transition-colors hover:bg-muted/50'
          )}
        >
          {cardContent}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border-0 bg-card shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="px-3 pt-2.5">{priorityBadge}</div>
          <div className="flex items-start gap-3 px-3 pt-2 pb-2.5">{cardContent}</div>
        </div>
      )}

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTaskTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteTaskDescription', { title: task.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
