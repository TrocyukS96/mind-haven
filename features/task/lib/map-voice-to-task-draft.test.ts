import { describe, expect, it } from 'vitest';
import { mapVoiceResultToTaskDraft } from '@/features/task/lib/map-voice-to-task-draft';

describe('mapVoiceResultToTaskDraft', () => {
  it('maps nullable fields to form draft', () => {
    const draft = mapVoiceResultToTaskDraft({
      title: 'Buy groceries',
      description: null,
      priority: null,
      deadline: null,
      type: null,
      subtasks: ['milk', 'bread'],
    });

    expect(draft).toEqual({
      title: 'Buy groceries',
      subtasks: ['milk', 'bread'],
    });
  });

  it('maps goalId to form draft', () => {
    const draft = mapVoiceResultToTaskDraft({
      title: 'Task',
      goalId: 'goal-1',
    });

    expect(draft.goalId).toBe('goal-1');
  });
});
