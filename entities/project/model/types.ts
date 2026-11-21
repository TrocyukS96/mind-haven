import type { TaskPriority } from '@/entities/task/model/types';

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: TaskPriority;
  startDate?: string;
  plannedEnd?: string;
  color?: string;
  icon?: string;
  goalId?: string;
  nextAction: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectDeleteMode = 'detach' | 'unlink';