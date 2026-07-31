import { describe, expect, it } from 'vitest';
import { extractJsonText, parseModelJson } from '@/shared/lib/voice/parse-model-json';

describe('parseModelJson', () => {
  it('parses raw JSON', () => {
    expect(parseModelJson('{"title":"Call client"}')).toEqual({ title: 'Call client' });
  });

  it('parses JSON wrapped in markdown fences', () => {
    const input = '```json\n{"title":"Buy milk","subtasks":["bread"]}\n```';
    expect(parseModelJson(input)).toEqual({ title: 'Buy milk', subtasks: ['bread'] });
  });

  it('parses JSON with leading explanatory text', () => {
    const input = 'Result:\n{"title":"Meeting","priority":"high"}';
    expect(parseModelJson(input)).toEqual({ title: 'Meeting', priority: 'high' });
  });

  it('throws for non-json content', () => {
    expect(() => parseModelJson('just text')).toThrow('Invalid JSON');
  });
});

describe('extractJsonText', () => {
  it('extracts object from mixed response', () => {
    expect(extractJsonText('Here you go: {"title":"Task"}')).toBe('{"title":"Task"}');
  });
});
