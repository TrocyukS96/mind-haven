import { describe, expect, it } from 'vitest';
import type { Task } from '@/entities/task/model/types';
import { insertProjectStep, projectStepIdsAfterMove, sortProjectSteps } from './project-step-order';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: partial.id,
    completed: false,
    priority: 'medium',
    type: 'backlog',
    createdAt: '2026-11-01T00:00:00.000Z',
    ...partial,
  };
}

describe('sortProjectSteps', () => {
  it('keeps the previous order while every step shares the default position', () => {
    const steps = sortProjectSteps([
      task({ id: 'done-early', completed: true, createdAt: '2026-11-01T00:00:00.000Z' }),
      task({ id: 'open-late', createdAt: '2026-11-03T00:00:00.000Z' }),
      task({ id: 'open-early', createdAt: '2026-11-02T00:00:00.000Z' }),
    ]);

    expect(steps.map((step) => step.id)).toEqual(['open-early', 'open-late', 'done-early']);
  });

  it('follows an explicit step order after a drag', () => {
    const steps = sortProjectSteps([
      task({ id: 'first', stepOrder: 0, completed: true, createdAt: '2026-11-03T00:00:00.000Z' }),
      task({ id: 'second', stepOrder: 1, createdAt: '2026-11-01T00:00:00.000Z' }),
      task({ id: 'third', stepOrder: 2, createdAt: '2026-11-02T00:00:00.000Z' }),
    ]);

    expect(steps.map((step) => step.id)).toEqual(['first', 'second', 'third']);
  });
});

describe('insertProjectStep', () => {
  it('places a new step after open steps and before completed ones', () => {
    const tasks = [
      task({ id: 'open', projectId: 'p', createdAt: '2026-11-01T00:00:00.000Z' }),
      task({ id: 'done', projectId: 'p', completed: true, createdAt: '2026-11-02T00:00:00.000Z' }),
    ];

    expect(insertProjectStep(tasks, 'p', 'new')).toEqual({
      orderedIds: ['open', 'new', 'done'],
      stepOrder: 1,
    });
  });

  it('appends a step after a custom order', () => {
    const tasks = [
      task({ id: 'done', projectId: 'p', completed: true, stepOrder: 0 }),
      task({ id: 'open', projectId: 'p', stepOrder: 1 }),
    ];

    expect(insertProjectStep(tasks, 'p', 'new').orderedIds).toEqual(['done', 'open', 'new']);
  });
});

describe('projectStepIdsAfterMove', () => {
  it('reorders the visible steps and leaves filtered ones in place', () => {
    expect(projectStepIdsAfterMove(['a', 'b', 'c', 'd'], ['d', 'b'])).toEqual(['a', 'd', 'c', 'b']);
  });
});
