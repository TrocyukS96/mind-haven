import type { TaskPriority } from '../model/types';

export const TASK_PRIORITY_STYLES: Record<TaskPriority, { badge: string }> = {
  urgent: {
    badge:
      'bg-red-500/15 text-red-700 border border-red-500/25 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
  },
  high: {
    badge:
      'bg-amber-500/15 text-amber-800 border border-amber-500/25 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
  },
  medium: {
    badge:
      'bg-sky-500/12 text-sky-800 border border-sky-500/20 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25',
  },
  low: {
    badge: 'bg-muted/70 text-muted-foreground border border-border',
  },
};

export function getTaskPriorityStyle(priority: TaskPriority) {
  return TASK_PRIORITY_STYLES[priority];
}
