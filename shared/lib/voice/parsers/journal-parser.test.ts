import { describe, expect, it } from 'vitest';
import { normalizeParsedJournal } from '@/shared/lib/voice/parsers/journal-parser';

const tags = [
  { id: 'tag-1', name: 'Работа' },
  { id: 'tag-2', name: 'Отдых' },
];

describe('normalizeParsedJournal', () => {
  it('parses a complete journal payload', () => {
    const result = normalizeParsedJournal(
      {
        title: ' Productive day ',
        content: 'Today I finished the voice feature and tested it.',
        date: '2026-07-31T00:00:00.000Z',
        tagName: 'работа',
      },
      tags
    );

    expect(result).toEqual({
      title: 'Productive day',
      content: 'Today I finished the voice feature and tested it.',
      date: '2026-07-31T00:00:00.000Z',
      tagId: 'tag-1',
      tagName: null,
    });
  });

  it('throws when content is missing', () => {
    expect(() => normalizeParsedJournal({ title: 'Title only' }, tags)).toThrow(
      'Journal content is missing from AI response'
    );
  });

  it('keeps tagName when tag is not in catalog', () => {
    const result = normalizeParsedJournal(
      {
        title: 'Entry',
        content: 'Some thoughts',
        tagName: 'Путешествия',
      },
      tags
    );

    expect(result.tagId).toBeNull();
    expect(result.tagName).toBe('Путешествия');
  });
});
