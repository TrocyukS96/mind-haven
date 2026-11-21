'use client';

import type { Task } from '@/entities/task/model/types';
import type { TaskColumn } from '@/entities/task-column/model/types';
import { taskColumnErrorText } from '@/features/task/lib/task-column-error';
import {
  formatColumnDate,
  isPastWeekColumn,
  resolveTaskColumnId,
} from '@/shared/lib/planner/week-column-range';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { cn } from '@/shared/lib/utils';
import { Columns3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-toastify';

function columnRange(column: TaskColumn): string | null {
  const from = formatColumnDate(column.dateFrom);
  const to = formatColumnDate(column.dateTo);
  if (from && to) return `${from}–${to}`;
  return from ?? to;
}

export function TaskColumnsManager({ onOpenArchive }: { onOpenArchive: () => void }) {
  const t = useTranslations('tasks');
  const taskColumns = useStore((state) => state.taskColumns);
  const tasks = useStore((state) => state.tasks);
  const updateTaskColumn = useStore((state) => state.updateTaskColumn);
  const [busy, setBusy] = useState(false);

  const active = [...taskColumns]
    .filter((column) => !column.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const resolveColumns = active;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(taskColumnErrorText(error, t, 'columns.saveColumnError'));
    } finally {
      setBusy(false);
    }
  };

  const setHidden = (columns: TaskColumn[], isHidden: boolean) =>
    run(() => Promise.all(columns.map((column) => updateTaskColumn(column.id, { isHidden }))).then(() => undefined));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Columns3 className="h-4 w-4" />
          {t('columns.manageColumns')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void setHidden(active.filter((column) => column.isHidden), false)}
          >
            {t('columns.showAll')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              void setHidden(
                active.filter((column) => isPastWeekColumn(column) && !column.isHidden),
                true
              )
            }
          >
            {t('columns.hidePastWeeks')}
          </Button>
        </div>
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {active.map((column) => (
            <li key={column.id} className="flex items-center gap-2 rounded-md px-1 py-1.5">
              <VisibilitySwitch
                checked={!column.isHidden}
                label={column.isHidden ? t('columns.show') : t('columns.hide')}
                disabled={busy}
                onChange={(visible) => void run(() => updateTaskColumn(column.id, { isHidden: !visible }))}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{column.title}</p>
                {columnRange(column) ? (
                  <p className="truncate text-xs text-muted-foreground">{columnRange(column)}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t('columns.tasksInColumn', {
                  count: countColumnTasks(tasks, column, resolveColumns),
                })}
              </span>
            </li>
          ))}
        </ul>
        <Button type="button" variant="ghost" size="sm" className="mt-2 w-full" onClick={onOpenArchive}>
          {t('columns.weekArchive')}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function countColumnTasks(tasks: Task[], column: TaskColumn, columns: TaskColumn[]): number {
  return tasks.filter((task) => resolveTaskColumnId(task, columns) === column.id).length;
}

function VisibilitySwitch({
  checked,
  label,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-all',
          checked ? 'left-4' : 'left-0.5'
        )}
      />
    </button>
  );
}
