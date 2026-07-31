import { describe, expect, it } from 'vitest';
import { normalizeParsedGoal } from '@/shared/lib/voice/parsers/goal-parser';

describe('normalizeParsedGoal', () => {
  it('parses a complete goal payload', () => {
    const result = normalizeParsedGoal({
      title: ' Launch MindHaven ',
      description: 'Build MVP and release',
      priority: 'high',
      deadline: '2026-12-31T00:00:00.000Z',
      type: 'long',
      steps: ['Design UI', ''],
    });

    expect(result).toEqual({
      title: 'Launch MindHaven',
      description: 'Build MVP and release',
      priority: 'high',
      deadline: '2026-12-31T00:00:00.000Z',
      type: 'long',
      steps: ['Design UI'],
    });
  });

  it('throws when title is missing', () => {
    expect(() => normalizeParsedGoal({ priority: 'low' })).toThrow(
      'Goal title is missing from AI response'
    );
  });

  it('maps russian priority aliases', () => {
    const result = normalizeParsedGoal({
      title: 'Goal',
      priority: 'срочный',
    });

    expect(result.priority).toBe('urgent');
  });
});
