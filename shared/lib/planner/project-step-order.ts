import type { Task } from '@/entities/task/model/types';
import { mergeReorderedVisibleColumns } from '@/shared/lib/planner/week-column-range';

export function sortProjectSteps(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const orderA = a.stepOrder ?? 0;
    const orderB = b.stepOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const created = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (created !== 0) return created;
    return a.id.localeCompare(b.id);
  });
}

export function nextProjectStepOrder(tasks: Task[], projectId: string): number {
  return insertProjectStep(tasks, projectId, '').stepOrder;
}

/** Inserts a step at the end, or before completed steps until the order is customized. */
export function insertProjectStep(
  tasks: Task[],
  projectId: string,
  taskId: string
): { orderedIds: string[]; stepOrder: number } {
  const existing = sortProjectSteps(
    tasks.filter((task) => task.projectId === projectId && task.id !== taskId)
  );
  const orders = existing.map((step) => step.stepOrder ?? 0);
  const customized = orders.some((order) => order !== (orders[0] ?? 0));
  const completedAt = existing.findIndex((step) => step.completed);
  const insertAt = customized || completedAt === -1 ? existing.length : completedAt;
  const orderedIds = existing.map((step) => step.id);
  if (taskId) orderedIds.splice(insertAt, 0, taskId);
  return { orderedIds, stepOrder: insertAt };
}

/** Places the reordered visible steps back into the full project order. */
export function projectStepIdsAfterMove(sortedIds: string[], visibleOrderedIds: string[]): string[] {
  const known = new Set(sortedIds);
  const visible = visibleOrderedIds.filter((id, index) => known.has(id) && visibleOrderedIds.indexOf(id) === index);
  const visibleSet = new Set(visible);
  const previousVisible = sortedIds.filter((id) => visibleSet.has(id));
  return mergeReorderedVisibleColumns(sortedIds, previousVisible, visible);
}
