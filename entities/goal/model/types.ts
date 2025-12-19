import { Task } from "@/entities/task/model/types";

export type GoalType = 'short' | 'medium' | 'long';

export type GoalStatus =
  | 'not-started'
  | 'on-track'
  | 'at-risk'
  | 'completed';

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  deadline: string;
  category: 'week' | 'month' | 'year';
  type: GoalType;
  tasks: Task[];
}

export type GoalCategory = 'all' | 'week' | 'month' | 'year';
