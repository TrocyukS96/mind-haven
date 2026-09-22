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
import { Calendar, Edit, MoreVertical, Trash2, Brain, Target } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { toast } from 'react-toastify';
import { useStore } from '@/shared/store/store-config';
import { useState, type PointerEvent } from 'react';
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
import { KanbanItemDragHandle, useKanbanItemSortable } from '@/shared/ui/kanban-item-sortable';
import { getTaskPriorityStyle } from '../lib/get-task-priority-style';

interface TaskCardProps {
  task: Task;
  showGoalTitle?: boolean;
  showType?: boolean;
  variant?: 'default' | 'step';
}

const PRIORITY_ACCENT: Record<Task['priority'], string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-amber-500',
  medium: 'border-l-sky-500',
  low: 'border-l-border',
};

function stopCardDrag(event: PointerEvent) {
  event.stopPropagation();
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
  const sortable = useKanbanItemSortable();
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

  const priorityBadge = (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-medium',
        isStep ? 'text-[10px]' : 'text-[11px]',
        priorityStyle.badge,
        task.completed && 'opacity-60'
      )}
    >
      {priorityLabels[task.priority]}
    </span>
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 cursor-pointer"
          onPointerDown={stopCardDrag}
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
  );

  return (
    <>
      {isStep ? (
        <div className="group relative flex w-full items-center gap-2 rounded-lg py-1 transition-colors hover:bg-muted/50">
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => toggleTask(task.id)}
            className="ml-1.5 h-4 w-4 shrink-0 cursor-pointer"
          />
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'block truncate text-sm',
                task.completed && 'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 self-start">
            {priorityBadge}
            {menu}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'rounded-xl border border-border/70 bg-card shadow-sm transition-all duration-200 hover:shadow-md',
            'border-l-2',
            PRIORITY_ACCENT[task.priority],
            task.completed && 'opacity-80',
            sortable && 'cursor-grab active:cursor-grabbing'
          )}
          {...(sortable?.listeners ?? {})}
        >
          <div className="flex flex-col gap-2 p-2.5">
            <div className="flex items-center gap-1.5">
              <KanbanItemDragHandle className="-ml-0.5" />
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
                onPointerDown={stopCardDrag}
                className="h-4 w-4 shrink-0 cursor-pointer"
              />
              {priorityBadge}
              {showType && (
                <ItemTypeBadge
                  section="tasks"
                  typeKey={task.type}
                  className="h-5 shrink-0 px-1.5 text-[10px] font-normal"
                />
              )}
              <div className="ml-auto">{menu}</div>
            </div>

            <p
              title={task.title}
              className={cn(
                'line-clamp-2 break-words text-sm font-medium leading-5',
                task.completed && 'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </p>

            {task.description && (
              <p
                title={task.description}
                className="line-clamp-2 break-words text-xs leading-5 text-muted-foreground"
              >
                {task.description}
              </p>
            )}

            {(formattedDeadline || (showGoalTitle && goal)) && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {formattedDeadline && (
                  <span
                    className={cn(
                      'inline-flex min-w-0 items-center gap-1',
                      task.overdue && !task.completed && 'text-destructive'
                    )}
                  >
                    <Calendar size={12} className="shrink-0" />
                    <span className="truncate">
                      {formattedDeadline}
                      {task.overdue && !task.completed && ` · ${t('overdueBadge')}`}
                    </span>
                  </span>
                )}
                {showGoalTitle && goal && (
                  <span
                    title={t('linkedToGoal', { goal: goal.title })}
                    className="inline-flex min-w-0 flex-1 items-center gap-1"
                  >
                    <Target size={12} className="shrink-0" />
                    <span className="truncate">{goal.title}</span>
                  </span>
                )}
              </div>
            )}
          </div>
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
