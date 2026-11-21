'use client';

import { listTaskColumnsRequest } from '@/entities/task-column/api/task-column-client';
import { isPlannerApiEnabled } from '@/entities/planner/lib/resolve-planner-api';
import { createWeekColumn } from '@/features/task/lib/create-task-column';
import { taskColumnErrorText } from '@/features/task/lib/task-column-error';
import { formatColumnDate } from '@/shared/lib/planner/week-column-range';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export function TaskWeekArchiveDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('tasks');
  const locale = useLocale();
  const taskColumns = useStore((state) => state.taskColumns);
  const tasks = useStore((state) => state.tasks);
  const projects = useStore((state) => state.projects);
  const goals = useStore((state) => state.goals);
  const replaceTaskColumns = useStore((state) => state.replaceTaskColumns);
  const restoreTaskColumn = useStore((state) => state.restoreTaskColumn);
  const moveOpenTasksToColumn = useStore((state) => state.moveOpenTasksToColumn);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isPlannerApiEnabled()) return;
    let cancelled = false;
    setLoading(true);
    listTaskColumnsRequest({ archivedOnly: true })
      .then((columns) => {
        if (!cancelled) replaceTaskColumns(columns, 'archived');
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(taskColumnErrorText(error, t, 'columns.restoreColumnError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, replaceTaskColumns, t]);

  const archived = [...taskColumns]
    .filter((column) => column.archivedAt)
    .sort((a, b) => (b.dateFrom ?? '').localeCompare(a.dateFrom ?? ''));

  const restore = async (id: string) => {
    setBusyId(id);
    try {
      await restoreTaskColumn(id);
      toast.success(t('columns.weekRestored'));
    } catch (error) {
      toast.error(taskColumnErrorText(error, t, 'columns.restoreColumnError'));
    } finally {
      setBusyId(null);
    }
  };

  const moveOpen = async (id: string) => {
    setBusyId(id);
    try {
      const created = await createWeekColumn(useStore.getState);
      const moved = moveOpenTasksToColumn(id, created.id);
      toast.success(moved > 0 ? t('columns.openTasksMoved') : t('columns.noOpenTasks'));
    } catch (error) {
      toast.error(taskColumnErrorText(error, t, 'columns.createColumnError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('columns.weekArchive')}</DialogTitle>
          <DialogDescription>
            {loading
              ? t('columns.loadingArchive')
              : archived.length === 0
                ? t('columns.noArchivedWeeks')
                : t('columns.tasksInColumn', {
                    count: archived.reduce(
                      (total, column) => total + tasks.filter((task) => task.columnId === column.id).length,
                      0
                    ),
                  })}
          </DialogDescription>
        </DialogHeader>
        {loading ? <p className="text-sm text-muted-foreground">{t('columns.loadingArchive')}</p> : null}
        {!loading && archived.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('columns.noArchivedWeeks')}</p>
        ) : null}
        <div className="space-y-4">
          {archived.map((column) => {
            const columnTasks = tasks.filter((task) => task.columnId === column.id);
            const from = formatColumnDate(column.dateFrom);
            const to = formatColumnDate(column.dateTo);
            const openCount = columnTasks.filter((task) => !task.completed).length;
            return (
              <section key={column.id} className="space-y-2 rounded-lg border border-border/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{column.title}</h3>
                    {from && to ? (
                      <p className="text-xs text-muted-foreground">
                        {from}–{to}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {t('columns.tasksInColumn', { count: columnTasks.length })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === column.id}
                      onClick={() => void restore(column.id)}
                    >
                      {t('columns.restore')}
                    </Button>
                    {column.kind === 'week' && openCount > 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === column.id}
                        onClick={() => void moveOpen(column.id)}
                      >
                        {t('columns.moveOpenTasks')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {columnTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('columns.noColumnTasks')}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {columnTasks.map((task) => {
                      const project = projects.find((item) => item.id === task.projectId);
                      const goal = goals.find((item) => item.id === task.goalId);
                      return (
                        <li key={task.id} className="rounded-md bg-muted/40 px-2 py-1.5 text-sm">
                          <p className={cn('break-words', task.completed && 'text-muted-foreground line-through')}>
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.completed ? t('columns.completedTask') : t('columns.openTask')}
                            {task.deadline
                              ? ` · ${new Date(task.deadline).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US')}`
                              : ''}
                            {project ? ` · ${project.title}` : ''}
                            {goal ? ` · ${goal.title}` : ''}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
