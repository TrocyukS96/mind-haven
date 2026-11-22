import type { TaskPriority } from '@/entities/task/model/types';

export const WEEK_LOCAL_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type WeekLocalStatus = (typeof WEEK_LOCAL_STATUSES)[number];

export const WEEK_LOCAL_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export interface WeekLocalTask {
  id: string;
  weekColumnId: string;
  title: string;
  description?: string;
  plannedDate?: string | null;
  priority: TaskPriority;
  status: WeekLocalStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeekTaskPlacement {
  taskId: string;
  weekColumnId: string;
  plannedDate?: string | null;
  sortOrder: number;
}

export interface WeekLayoutPatch {
  localTasks: Array<{ id: string; plannedDate: string | null; sortOrder: number }>;
  placements: Array<{ taskId: string; plannedDate: string | null; sortOrder: number }>;
}
