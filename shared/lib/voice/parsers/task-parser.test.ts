import { describe, expect, it } from 'vitest';
import { normalizeParsedTask } from '@/shared/lib/voice/parsers/task-parser';
import { mapVoiceResultToTaskDraft } from '@/features/task/lib/map-voice-to-task-draft';

describe('normalizeParsedTask', () => {
  it('parses a complete task payload', () => {
    const result = normalizeParsedTask({
      title: ' Call client ',
      description: 'Prepare questions',
      priority: 'high',
      deadline: '2026-08-01T09:00:00.000Z',
      type: 'short',
      subtasks: ['Send agenda', ''],
    });

    expect(result).toEqual({
      title: 'Call client',
      description: 'Prepare questions',
      priority: 'high',
      deadline: '2026-08-01T09:00:00.000Z',
      type: 'short',
      subtasks: ['Send agenda'],
      goalId: null,
    });
  });

  it('throws when title is missing', () => {
    expect(() => normalizeParsedTask({ priority: 'low' })).toThrow(
      'Task title is missing from AI response'
    );
  });

  it('ignores invalid enum values', () => {
    const result = normalizeParsedTask({
      title: 'Buy groceries',
      priority: 'critical',
      type: 'someday',
      deadline: 'not-a-date',
    });

    expect(result.priority).toBeNull();
    expect(result.type).toBeNull();
    expect(result.deadline).toBeNull();
  });

  it('maps russian priority aliases', () => {
    const result = normalizeParsedTask({
      title: 'Task',
      priority: 'высоким',
    });

    expect(result.priority).toBe('high');
  });
});

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
