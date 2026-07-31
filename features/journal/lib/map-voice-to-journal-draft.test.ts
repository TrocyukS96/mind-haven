import { describe, expect, it } from 'vitest';
import { buildJournalFormValues } from '@/features/journal/lib/journal-form-initial-values';
import { mapVoiceResultToJournalDraft } from '@/features/journal/lib/map-voice-to-journal-draft';

describe('mapVoiceResultToJournalDraft', () => {
  it('maps voice result to journal draft', () => {
    const draft = mapVoiceResultToJournalDraft({
      title: 'Good day',
      content: 'Felt productive and calm.',
      date: '2026-07-31T00:00:00.000Z',
      tagId: 'tag-1',
    });

    expect(draft).toEqual({
      title: 'Good day',
      content: 'Felt productive and calm.',
      date: '2026-07-31T00:00:00.000Z',
      tagId: 'tag-1',
    });
  });
});

describe('buildJournalFormValues', () => {
  it('uses voice draft when opening create form', () => {
    const values = buildJournalFormValues({
      draft: {
        title: 'Вечерняя рефлексия',
        content: 'Сегодня был хороший день.',
        date: '2026-07-31T00:00:00.000Z',
        tagId: 'tag-1',
      },
    });

    expect(values.title).toBe('Вечерняя рефлексия');
    expect(values.content).toBe('Сегодня был хороший день.');
    expect(values.selectedTagId).toBe('tag-1');
  });
});
