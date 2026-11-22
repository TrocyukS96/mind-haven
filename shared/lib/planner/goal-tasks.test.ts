import { describe, expect, it } from 'vitest';
import { goalStepTaskIds } from './goal-tasks';
import type { Task } from '@/entities/task/model/types';

function task(id: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    completed: false,
    priority: 'medium',
    type: 'backlog',
    createdAt: '2026-11-01T00:00:00.000Z',
    ...extra,
  };
}

describe('goalStepTaskIds', () => {
  it('deletes steps and leaves tasks that belong to a linked project', () => {
    const ids = goalStepTaskIds(
      'goal-1',
      [
        task('step', { goalId: 'goal-1' }),
        task('project-task', { goalId: 'goal-1', projectId: 'project-1' }),
        task('other', { goalId: 'goal-2' }),
      ],
      [task('embedded', { goalId: 'goal-1' })],
      [{ id: 'project-1', goalId: 'goal-1' }]
    );

    expect(ids.sort()).toEqual(['embedded', 'step']);
  });
});