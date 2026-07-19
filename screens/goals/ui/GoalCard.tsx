'use client';

import { Goal } from '@/entities/goal/model/types';
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
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Brain, Calendar, ChevronRight, Edit, MoreVertical, Plus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { TaskCard } from '@/entities/task';
import { getTaskPriorityStyle } from '@/entities/task/lib/get-task-priority-style';
import { TaskPriority } from '@/entities/task/model/types';
import { useStore } from '@/shared/store/store-config';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { getGoalStatus } from '@/shared/lib/goal-heplers';
import { ItemTypeBadge } from '@/shared/ui/item-type-badge';
import { cn } from '@/shared/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { getGoalStatusCardStyle } from '../libs/get-goal-card-status-style';

interface Props {
  goal: Goal;
  showType?: boolean;
}

const GoalCard = ({ goal, showType = true }: Props) => {
  const { openTaskForm, deleteGoal, openGoalForm } = useStore();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const status = getGoalStatus(goal.progress);
  const statusStyle = getGoalStatusCardStyle(status);
  const t = useTranslations('goals');
  const tCommon = useTranslations('common');
  const tPriorities = useTranslations('priorities');
  const locale = useLocale();

  const goalPriority: TaskPriority = goal.priority || 'medium';
  const priorityStyle = getTaskPriorityStyle(goalPriority);
  const priorityLabels: Record<TaskPriority, string> = {
    low: tPriorities('low'),
    medium: tPriorities('medium'),
    high: tPriorities('high'),
    urgent: tPriorities('urgent'),
  };

  const statusLabels = {
    completed: t('status.completed'),
    'on-track': t('status.onTrack'),
    'at-risk': t('status.atRisk'),
    'not-started': t('status.notStarted'),
  };

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden transition-all duration-300 hover:shadow-md',
          statusStyle.card
        )}
      >
        <div className={statusStyle.cornerGlow} aria-hidden />
        <CardContent className="relative z-[1] px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                priorityStyle.badge,
                status === 'completed' && 'opacity-60'
              )}
            >
              {priorityLabels[goalPriority]}
            </span>

            {status !== 'not-started' && (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  statusStyle.badge
                )}
              >
                {statusLabels[status]}
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-foreground break-words leading-snug">
                  {goal.title}
                </h3>
                {showType && (
                  <ItemTypeBadge
                    section="goals"
                    typeKey={goal.type}
                    className="text-xs font-normal"
                  />
                )}
              </div>

              {goal.description && (
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {goal.description}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar size={14} className="text-primary shrink-0" />
                <span>
                  {new Date(goal.deadline).toLocaleDateString(
                    locale === 'ru' ? 'ru-RU' : 'en-US',
                    {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }
                  )}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => openGoalForm(goal)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {tCommon('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tCommon('delete')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast.info(t('analyzeNotImplemented'), {
                      icon: <Brain className="h-4 w-4" />,
                      className: 'border border-border',
                    });
                  }}
                >
                  <Brain className="mr-2 h-4 w-4" />
                  {tCommon('analyze')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-2 border-t border-border/40 pt-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStepsExpanded((expanded) => !expanded)}
                className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                aria-expanded={stepsExpanded}
              >
                <ChevronRight
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-200',
                    stepsExpanded && 'rotate-90'
                  )}
                />
                <span className="truncate">{t('stepsToGoal')}</span>
                <span className="text-muted-foreground font-normal">({goal.tasks.length})</span>
              </button>

              <Button
                size="icon"
                variant="outline"
                onClick={() => openTaskForm(undefined, goal.id)}
                className="h-8 w-8 shrink-0 bg-background/60 backdrop-blur-sm"
                aria-label={tCommon('add')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {stepsExpanded && (
              <div className="mt-2 space-y-1.5">
                {goal.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} showType={false} variant="step" />
                ))}
                {goal.tasks.length === 0 && (
                  <p className="py-1 text-sm text-muted-foreground italic">
                    {t('noStepsYet')}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t('deleteGoalTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              {t('deleteGoalDescription', { title: goal.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteGoal(goal.id);
                toast.success(t('goalDeleted'));
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GoalCard;
