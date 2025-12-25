'use client';

import { useMemo } from "react";
import { Task, TaskPriority } from "@/entities/task/model/types";

type FilterState = {
  priority?: TaskPriority | 'all';
  overdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

export function useFilteredTasks(tasks: Task[], searchQuery: string, filter: FilterState) {
  return useMemo(() => {
    let result = tasks;

    // Поиск
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q));
    }

    // Фильтр
    if (filter.priority && filter.priority !== 'all') {
      result = result.filter(t => t.priority === filter.priority);
    }
    if (filter.overdue !== undefined) {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(t => filter.overdue === (t.deadline && t.deadline < today && !t.completed));
    }
    if (filter.dateFrom) {
      result = result.filter(t => t.deadline && filter.dateFrom && new Date(t.deadline) >= new Date(filter.dateFrom));
    }
    if (filter.dateTo) {
      result = result.filter(t => t.deadline && filter.dateTo && new Date(t.deadline) <= new Date(filter.dateTo));
    }

    return result;
  }, [tasks, searchQuery, filter]);
}