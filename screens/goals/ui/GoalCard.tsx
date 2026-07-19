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
import { Brain, Calendar, Clock, Edit, MoreVertical, Plus, Target, Trash2 } from 'lucide-react';
import { getProgressColor } from '../libs/get-progress-color';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { TaskCard } from '@/entities/task';
import { useStore } from '@/shared/store/store-config';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { getGoalStatus } from '@/shared/lib/goal-heplers';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';
import { useLocale, useTranslations } from 'next-intl';

interface Props {
  goal: Goal;
}

const GoalCard = ({ goal }: Props) => {
  const { openTaskForm, deleteGoal, openGoalForm } = useStore();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const status = getGoalStatus(goal.progress);
  const t = useTranslations('goals');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const getTypeConfig = (type: Goal['type']) => {
    switch (type) {
      case 'short':
        return {
          label: t('types.short'),
          icon: Clock,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
        };
      case 'medium':
        return {
          label: t('types.medium'),
          icon: Clock,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
        };
      case 'long':
        return {
          label: t('types.long'),
          icon: Target,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
        };
      default:
        return {
          label: t('defaultLabel'),
          icon: Target,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
        };
    }
  };

  const statusLabels = {
    completed: t('status.completed'),
    'on-track': t('status.onTrack'),
    'at-risk': t('status.atRisk'),
    'not-started': t('status.notStarted'),
  };

  const typeConfig = getTypeConfig(goal.type);
  const TypeIcon = typeConfig.icon;

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-300 group border-border/50">
        <CardContent className="p-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                      typeConfig.bgColor,
                      typeConfig.borderColor,
                      typeConfig.color
                    )}
                  >
                    <TypeIcon className="h-3 w-3" />
                    {typeConfig.label}
                  </span>

                  <Badge
                    variant={
                      status === 'completed'
                        ? 'default'
                        : status === 'on-track'
                          ? 'default'
                          : status === 'at-risk'
                            ? 'destructive'
                            : 'secondary'
                    }
                    className="text-xs font-medium"
                  >
                    {statusLabels[status]}
                  </Badge>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-2 break-words">
                  {goal.title}
                </h3>

                {goal.description && (
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                    {goal.description}
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {tCommon('progress')}
                </span>
                <span className="text-sm font-semibold text-primary">{goal.progress}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${goal.progress}%`,
                    backgroundColor: getProgressColor(goal.progress),
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar size={16} className="text-primary" />
                <span className="font-medium">
                  {new Date(goal.deadline).toLocaleDateString(
                    locale === 'ru' ? 'ru-RU' : 'en-US',
                    {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }
                  )}
                </span>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <Target size={20} className="text-primary" />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-foreground">{t('stepsToGoal')}</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openTaskForm(undefined, goal.id)}
                className="h-8 px-3"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {tCommon('add')}
              </Button>
            </div>

            <div className="space-y-2.5">
              {goal.tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {goal.tasks.length === 0 && (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground italic">{t('noStepsYet')}</p>
                </div>
              )}
            </div>
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
