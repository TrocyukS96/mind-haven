export type PointReason =
  | 'task_completed'
  | 'task_completed_on_time'
  | 'task_completed_early'
  | 'task_completed_late'
  | 'goal_completed'
  | 'goal_completed_on_time'
  | 'journal_free_entry'
  | 'journal_reflection'
  | 'journal_reflection_full'
  | 'habit_day_completed'
  | 'habit_streak_7'
  | 'habit_streak_30'
  | 'table_row_added'
  | 'table_cell_updated'
  | 'reward_claimed';

export interface PointTransaction {
  id: string;
  amount: number;
  reason: PointReason;
  sourceId?: string;
  idempotencyKey: string;
  createdAt: string;
  description?: string;
}

export interface PointEvent {
  reason: PointReason;
  amount: number;
  sourceId?: string;
  idempotencyKey: string;
  description?: string;
}

export const POINTS_RULES = {
  task: {
    base: 5,
    onTime: 10,
    early: 15,
    late: 2,
  },
  goal: {
    completed: 25,
    completedOnTime: 50,
  },
  journal: {
    freeEntry: 8,
    reflectionBase: 15,
    reflectionPerExtraAnswer: 3,
    reflectionFullBonus: 10,
  },
  habit: {
    dayCompleted: 5,
    streak7: 20,
    streak30: 100,
  },
  table: {
    rowAdded: 2,
    cellUpdated: 1,
  },
} as const;
