export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: TaskPriority;
  goalId?: string;        // если есть — привязана к цели
  createdAt: string;
  completedAt?: string;
  deadline?: string;
}