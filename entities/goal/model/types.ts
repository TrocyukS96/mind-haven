import { Task } from "@/entities/task/model/types";

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  deadline: string;
  category: 'week' | 'month' | 'year';
  tasks: Task[];
}

export type GoalCategory = 'all' | 'week' | 'month' | 'year';
