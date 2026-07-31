import { describe, expect, it } from 'vitest';
import { normalizeVoiceIntent } from '@/shared/lib/voice/intent-classifier';

describe('normalizeVoiceIntent', () => {
  it('accepts supported entity types', () => {
    expect(normalizeVoiceIntent({ entityType: 'task' })).toBe('task');
    expect(normalizeVoiceIntent({ entityType: 'goal' })).toBe('goal');
    expect(normalizeVoiceIntent({ entityType: 'journal' })).toBe('journal');
    expect(normalizeVoiceIntent({ entityType: 'habit' })).toBe('habit');
    expect(normalizeVoiceIntent({ entityType: 'finance' })).toBe('finance');
  });

  it('throws for unsupported entity types', () => {
    expect(() => normalizeVoiceIntent({ entityType: 'note' })).toThrow(
      'Could not determine section from speech'
    );
  });

  it('throws for invalid payload', () => {
    expect(() => normalizeVoiceIntent(null)).toThrow('Could not determine section from speech');
  });
});
