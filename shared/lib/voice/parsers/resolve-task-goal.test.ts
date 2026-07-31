import { describe, expect, it } from 'vitest';
import { resolveTaskGoalId } from '@/shared/lib/voice/parsers/resolve-task-goal';
import { normalizeParsedTask } from '@/shared/lib/voice/parsers/task-parser';

const goals = [
  { id: 'goal-1', title: 'Запустить MVP' },
  { id: 'goal-2', title: 'Похудеть к лету' },
];

describe('resolveTaskGoalId', () => {
  it('returns goal id when AI provides a valid goalId', () => {
    expect(resolveTaskGoalId('goal-1', null, goals)).toBe('goal-1');
  });

  it('matches goal by exact title', () => {
    expect(resolveTaskGoalId(null, 'Запустить MVP', goals)).toBe('goal-1');
  });

  it('matches goal by partial title', () => {
    expect(resolveTaskGoalId(null, 'MVP', goals)).toBe('goal-1');
  });

  it('returns null when no goal matches', () => {
    expect(resolveTaskGoalId(null, 'Выучить испанский', goals)).toBeNull();
  });
});

describe('normalizeParsedTask goal linking', () => {
  it('resolves goalId from AI goalTitle against available goals', () => {
    const result = normalizeParsedTask(
      {
        title: 'Подготовить презентацию',
        goalTitle: 'запустить mvp',
      },
      goals
    );

    expect(result.goalId).toBe('goal-1');
  });

  it('prefers valid goalId from AI response', () => {
    const result = normalizeParsedTask(
      {
        title: 'Task',
        goalId: 'goal-2',
        goalTitle: 'wrong title',
      },
      goals
    );

    expect(result.goalId).toBe('goal-2');
  });
});
