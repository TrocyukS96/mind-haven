export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = string;

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TaskPriority;
  type: TaskType;
  goalId?: string;
  projectId?: string;
  columnId?: string;
  estimatedMinutes?: number;
  createdAt: string;
  completedAt?: string;
  deadline?: string;
  overdue?: boolean;
  kanbanOrder?: number;
  stepOrder?: number;
}