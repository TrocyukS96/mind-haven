'use client';

import { Task } from '../model/types';
import { Checkbox } from '@/shared/ui/checkbox';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Edit, MoreVertical, Trash2, Brain } from 'lucide-react';
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
import { useTranslations } from 'next-intl';

interface TaskCardProps {
  task: Task;
  showGoalTitle?: boolean;
}

export function TaskCard({ task, showGoalTitle = false }: TaskCardProps) {
  const { toggleTask, deleteTask, openTaskForm, goals } = useStore();
  const goal = goals.find((g) => g.id === task.goalId);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const tPriorities = useTranslations('priorities');

  const handleDeleteTask = () => {
    deleteTask(task);
    toast.success(t('taskDeleted'));
    setIsDeleteOpen(false);
  };

  const priorityLabels: Record<Task['priority'], string> = {
    low: tPriorities('low'),
    medium: tPriorities('medium'),
    high: tPriorities('high'),
    urgent: tPriorities('urgent'),
  };

  return (
    <>
      <div className="flex items-center gap-3 group relative py-2 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => toggleTask(task.id)}
          className="h-4 w-4 cursor-pointer"
        />

        <span
          className={cn(
            'text-sm flex-1',
            task.completed && 'line-through text-muted-foreground'
          )}
        >
          {task.title}
        </span>

        {showGoalTitle && goal && (
          <span className="text-xs text-muted-foreground truncate max-w-32">
            {goal.title}
          </span>
        )}

        <Badge
          variant={task.priority === 'urgent' ? 'destructive' : 'secondary'}
          className="text-xs"
        >
          {priorityLabels[task.priority]}
        </Badge>

        {task.overdue && (
          <Badge variant="destructive" className="text-xs">
            {t('overdueBadge')}
          </Badge>
        )}

        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer">
                <MoreVertical className="h-3.5 w-3.5" />
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
