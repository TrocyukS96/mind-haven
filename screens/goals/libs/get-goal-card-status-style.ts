import type { GoalStatus } from '@/entities/goal/model/types';

export const GOAL_STATUS_CARD_STYLES: Record<GoalStatus, { card: string; badge: string }> = {
  'at-risk': {
    card: 'border-0 bg-card',
    badge:
      'bg-red-500/15 text-red-700 border border-red-500/25 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
  },
  'on-track': {
    card: 'border-0 bg-card',
    badge:
      'bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/40',
  },
  completed: {
    card: 'border-0 bg-card',
    badge:
      'bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
  },
  'not-started': {
    card: 'border-0 bg-card',
    badge: 'bg-muted text-muted-foreground border border-border',
  },
};

export function getGoalStatusCardStyle(status: GoalStatus) {
  return GOAL_STATUS_CARD_STYLES[status];
}
