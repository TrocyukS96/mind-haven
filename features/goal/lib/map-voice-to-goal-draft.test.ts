import { describe, expect, it } from 'vitest';
import { mapVoiceResultToGoalDraft } from '@/features/goal/lib/map-voice-to-goal-draft';
import { buildGoalFormValues } from '@/features/goal/lib/goal-form-initial-values';

describe('mapVoiceResultToGoalDraft', () => {
  it('maps voice result fields to goal draft', () => {
    const draft = mapVoiceResultToGoalDraft({
      title: 'Launch MVP',
      description: 'Release first version',
      priority: 'high',
      deadline: '2026-12-31T00:00:00.000Z',
      type: 'medium',
      steps: ['Design', 'Build'],
    });

    expect(draft).toEqual({
      title: 'Launch MVP',
      description: 'Release first version',
      priority: 'high',
      deadline: '2026-12-31T00:00:00.000Z',
      type: 'medium',
      steps: ['Design', 'Build'],
    });
  });
});

describe('buildGoalFormValues', () => {
  it('uses voice draft values when opening create form', () => {
    const values = buildGoalFormValues({
      defaultType: 'backlog',
      draft: {
        title: 'Запустить MVP',
        priority: 'urgent',
        deadline: '2026-08-01T00:00:00.000Z',
        type: 'short',
        steps: ['Сделать лендинг'],
      },
    });

    expect(values.title).toBe('Запустить MVP');
    expect(values.priority).toBe('urgent');
    expect(values.type).toBe('short');
    expect(values.steps).toEqual(['Сделать лендинг']);
  });
});
