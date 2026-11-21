import { describe, expect, it } from 'vitest';
import { tasksForGoalProgress } from './calculate-progress';
import type { Task } from '@/entities/task/model/types';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: partial.title ?? 't',
    completed: partial.completed ?? false,
    priority: 'medium',
    type: 'backlog',
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe('tasksForGoalProgress', () => {
  it('counts direct tasks and project tasks once', () => {
    const projectGoalIds = new Map<string, string | undefined>([
      ['p1', 'g1'],
      ['p2', 'g2'],
    ]);

    const tasks = [
      task({ id: '1', goalId: 'g1' }),
      task({ id: '2', goalId: 'g1', projectId: 'p1' }),
      task({ id: '3', projectId: 'p1' }),
      task({ id: '4', projectId: 'p2', goalId: 'g2' }),
    ];

    const result = tasksForGoalProgress(tasks, 'g1', projectGoalIds);
    expect(result.map((t) => t.id).sort()).toEqual(['1', '2', '3']);
  });
});