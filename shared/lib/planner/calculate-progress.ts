import type { Task } from '@/entities/task/model/types';

export function calculateCompletionProgress(tasks: { completed: boolean }[]): number {
  if (tasks.length === 0) return 0;
  return Math.round(
    tasks.reduce((total, task) => total + (task.completed ? 100 : 20), 0) / tasks.length
  );
}

/** Tasks that belong directly to a goal (not via a linked project). */
export function directGoalTasks(tasks: Task[], goalId: string, projectGoalIds: Map<string, string | null | undefined>): Task[] {
  return tasks.filter((task) => {
    if (task.goalId !== goalId) return false;
    if (task.projectId && projectGoalIds.get(task.projectId) === goalId) return false;
    return true;
  });
}

/** Tasks belonging to projects linked to a goal. */
export function projectGoalTasks(
  tasks: Task[],
  goalId: string,
  projectsByGoal: Set<string>
): Task[] {
  return tasks.filter(
    (task) => task.projectId && projectsByGoal.has(task.projectId) && !task.goalId
  );
}

export function tasksForGoalProgress(
  tasks: Task[],
  goalId: string,
  projectGoalIds: Map<string, string | null | undefined>
): Task[] {
  const projectsLinkedToGoal = new Set<string>();
  for (const [projectId, linkedGoalId] of projectGoalIds) {
    if (linkedGoalId === goalId) {
      projectsLinkedToGoal.add(projectId);
    }
  }

  const direct = directGoalTasks(tasks, goalId, projectGoalIds);
  const viaProject = tasks.filter(
    (task) => task.projectId && projectsLinkedToGoal.has(task.projectId)
  );

  const seen = new Set<string>();
  const combined: Task[] = [];
  for (const task of [...direct, ...viaProject]) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    combined.push(task);
  }

  return combined;
}

export function tasksForProject(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((task) => task.projectId === projectId);
}