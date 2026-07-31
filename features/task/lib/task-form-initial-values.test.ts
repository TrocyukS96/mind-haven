import { describe, expect, it } from 'vitest';
import { buildTaskFormValues } from '@/features/task/lib/task-form-initial-values';

describe('buildTaskFormValues', () => {
  it('uses voice draft priority when opening create form', () => {
    const values = buildTaskFormValues({
      defaultType: 'backlog',
      draft: {
        title: 'заполнить ежедневник',
        priority: 'high',
        deadline: '2026-08-01T00:00:00.000Z',
      },
    });

    expect(values.priority).toBe('high');
    expect(values.title).toBe('заполнить ежедневник');
  });

  it('uses voice draft goalId when opening create form', () => {
    const values = buildTaskFormValues({
      defaultType: 'backlog',
      draft: {
        title: 'Подготовить презентацию',
        goalId: 'goal-1',
      },
    });

    expect(values.goalId).toBe('goal-1');
  });
});
