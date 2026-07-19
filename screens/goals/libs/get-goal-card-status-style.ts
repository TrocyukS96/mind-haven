import type { GoalStatus } from '@/entities/goal/model/types';

export const GOAL_STATUS_CARD_STYLES: Record<
  GoalStatus,
  { card: string; cornerGlow: string; badge: string }
> = {
  'at-risk': {
    card: 'relative border-0 bg-card',
    cornerGlow: 'goal-card-corner-glow goal-card-corner-glow--at-risk',
    badge:
      'bg-red-500/15 text-red-700 border border-red-500/25 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
  },
  'on-track': {
    card: 'relative border-0 bg-card',
    cornerGlow: 'goal-card-corner-glow goal-card-corner-glow--on-track',
    badge:
      'bg-primary/10 text-primary border border-primary/20 dark:bg-primary/15 dark:text-primary-foreground/90',
  },
  completed: {
    card: 'relative border-0 bg-card',
    cornerGlow: 'goal-card-corner-glow goal-card-corner-glow--completed',
    badge:
      'bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
  },
  'not-started': {
    card: 'relative border-0 bg-card',
    cornerGlow: 'goal-card-corner-glow goal-card-corner-glow--not-started',
    badge: 'bg-muted text-muted-foreground border border-border',
  },
};

export function getGoalStatusCardStyle(status: GoalStatus) {
  return GOAL_STATUS_CARD_STYLES[status];
}
