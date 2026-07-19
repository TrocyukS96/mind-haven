import type { SortMode } from '@/shared/config/display-modes';
import type { Task } from '@/entities/task/model/types';
import type { Goal } from '@/entities/goal/model/types';

export function sortTasks(tasks: Task[], sortMode: SortMode): Task[] {
  const sorted = [...tasks];

  switch (sortMode) {
    case 'by-day':
      return sorted.sort((a, b) => compareByDeadline(a.deadline, b.deadline));
    case 'calendar':
      return sorted.sort((a, b) => compareByDeadline(a.deadline, b.deadline));
    case 'list':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return sorted;
  }
}

export function sortGoals(goals: Goal[], sortMode: SortMode): Goal[] {
  const sorted = [...goals];

  switch (sortMode) {
    case 'by-day':
      return sorted.sort((a, b) => compareByDeadline(a.deadline, b.deadline));
    case 'calendar':
      return sorted.sort((a, b) => compareByDeadline(a.deadline, b.deadline));
    case 'list':
      return sorted.sort((a, b) => b.deadline.localeCompare(a.deadline));
    default:
      return sorted;
  }
}

function compareByDeadline(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}
