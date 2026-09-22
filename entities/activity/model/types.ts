export const ACTIVITY_TYPES = [
  'TASK_CREATED',
  'TASK_COMPLETED',
  'TASK_OVERDUE',
  'GOAL_CREATED',
  'GOAL_COMPLETED',
  'GOAL_STATUS_CHANGED',
  'HABIT_CREATED',
  'HABIT_COMPLETED',
  'JOURNAL_ENTRY_CREATED',
  'JOURNAL_ENTRY_UPDATED',
  'ENERGY_CHECK_IN_COMPLETED',
  'REFLECTION_CREATED',
  'DECISION_CREATED',
  'DECISION_UPDATED',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_CATEGORIES = [
  'TASK',
  'GOAL',
  'HABIT',
  'JOURNAL',
  'ENERGY',
  'REFLECTION',
  'DECISION',
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export type ActivityEntityType = ActivityCategory;

export interface ActivityEventMetadata {
  title?: string;
  score?: number;
  testVersionId?: string;
  goalId?: string;
  fromStatus?: string;
  toStatus?: string;
  date?: string;
  [key: string]: unknown;
}

export interface ActivityEvent {
  id: string;
  type: string;
  entityType: string;
  entityId: string | null;
  title: string;
  metadata: ActivityEventMetadata;
  createdAt: string;
}

export interface ActivityEventInput {
  type: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  metadata?: ActivityEventMetadata;
  idempotencyKey: string;
  createdAt?: string;
}

export const DATE_PRESETS = ['all', 'today', 'yesterday', 'last7', 'last30', 'custom'] as const;

export type DatePreset = (typeof DATE_PRESETS)[number];

export interface DateRangeValue {
  from?: string;
  to?: string;
}

export interface ActivityFilterState {
  datePreset: DatePreset;
  dateFrom?: string;
  dateTo?: string;
  category: ActivityCategory | 'all';
  search: string;
}

export const DEFAULT_ACTIVITY_FILTER: ActivityFilterState = {
  datePreset: 'all',
  category: 'all',
  search: '',
};

export interface ActivityListResult {
  events: ActivityEvent[];
  nextCursor: string | null;
}
