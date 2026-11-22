import type { Task } from '@/entities/task/model/types';

export function isGoalStepTask(
  task: { goalId?: string | null; projectId?: string | null },
  goalId: string,
  projects: { id: string; goalId?: string | null }[]
): boolean {
  if (task.goalId !== goalId) return false;
  if (!task.projectId) return true;

  const project = projects.find((item) => item.id === task.projectId);
  return project?.goalId !== goalId;
}

export function goalStepTaskIds(
  goalId: string,
  tasks: Task[],
  embedded: Task[],
  projects: { id: string; goalId?: string | null }[]
): string[] {
  const ids = new Set<string>();

  for (const task of tasks) {
    if (task?.id && isGoalStepTask(task, goalId, projects)) ids.add(task.id);
  }

  for (const task of embedded) {
    if (!task?.id) continue;
    if (isGoalStepTask({ ...task, goalId: task.goalId ?? goalId }, goalId, projects)) {
      ids.add(task.id);
    }
  }

  return [...ids];
}
