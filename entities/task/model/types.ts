export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = string;

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: TaskPriority;
  type: TaskType;
  goalId?: string;
  createdAt: string;
  completedAt?: string;
  deadline?: string;
  overdue?: boolean;
  kanbanOrder?: number;
}