'use client';

import { useMemo } from "react";
import { Task, TaskPriority } from "@/entities/task/model/types";
import { isPastWeekColumn, resolveTaskColumnId } from "@/shared/lib/planner/week-column-range";

type WeekColumnRef = {
  id: string;
  kind?: string;
  legacyKey?: string | null;
  archivedAt?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type TaskListFilter = {
  priority?: TaskPriority | 'all';
  overdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
  hideCompleted?: boolean;
  projectId?: string;
  goalId?: string;
  weeks?: 'all' | 'current';
};

export const DEFAULT_TASK_LIST_FILTER: TaskListFilter = {
  priority: 'all',
  hideCompleted: true,
};

export function isTaskListFilterActive(filter: TaskListFilter): boolean {
  return Boolean(
    (filter.priority && filter.priority !== 'all') ||
      filter.overdue ||
      filter.dateFrom ||
      filter.dateTo ||
      filter.hideCompleted === false ||
      (filter.projectId && filter.projectId !== 'all') ||
      (filter.goalId && filter.goalId !== 'all') ||
      filter.weeks === 'current'
  );
}

export function useFilteredTasks(
  tasks: Task[],
  searchQuery: string,
  filter: TaskListFilter,
  columns: WeekColumnRef[] = []
) {
  return useMemo(() => {
    let result = tasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((task) => task.title.toLowerCase().includes(q));
    }

    if (filter.priority && filter.priority !== 'all') {
      result = result.filter((task) => task.priority === filter.priority);
    }
    if (filter.hideCompleted !== false) {
      result = result.filter((task) => !task.completed);
    }
    if (filter.projectId && filter.projectId !== 'all') {
      result = result.filter((task) => task.projectId === filter.projectId);
    }
    if (filter.goalId && filter.goalId !== 'all') {
      result = result.filter((task) => task.goalId === filter.goalId);
    }
    if (filter.weeks === 'current') {
      const pastWeekIds = new Set(
        columns
          .filter((column) => !column.archivedAt && isPastWeekColumn(column))
          .map((column) => column.id)
      );
      if (pastWeekIds.size > 0) {
        result = result.filter((task) => !pastWeekIds.has(resolveTaskColumnId(task, columns)));
      }
    }
    if (filter.overdue !== undefined) {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(
        (task) => filter.overdue === Boolean(task.deadline && task.deadline < today && !task.completed)
      );
    }
    if (filter.dateFrom) {
      result = result.filter(
        (task) => task.deadline && filter.dateFrom && new Date(task.deadline) >= new Date(filter.dateFrom)
      );
    }
    if (filter.dateTo) {
      result = result.filter(
        (task) => task.deadline && filter.dateTo && new Date(task.deadline) <= new Date(filter.dateTo)
      );
    }

    return result;
  }, [tasks, searchQuery, filter, columns]);
}