import { describe, expect, it } from 'vitest';
import {
  mapJournalEntryFromDb,
  mapJournalTagFromDb,
  type JournalEntryDbRow,
  type JournalTagDbRow,
} from '@/shared/lib/journal/journal-entry-service';

describe('journal-entry-service mappers', () => {
  it('maps free journal entry from db', () => {
    const row: JournalEntryDbRow = {
      id: 'entry-1',
      userId: 'user-1',
      title: 'Morning note',
      content: 'Feeling good',
      date: new Date('2026-07-31T00:00:00.000Z'),
      entryType: 'free',
      reflectionPeriod: null,
      reflectionAnswers: null,
      tagIds: ['tag-1'],
      createdAt: new Date('2026-07-31T10:00:00.000Z'),
      updatedAt: new Date('2026-07-31T10:00:00.000Z'),
    };

    const entry = mapJournalEntryFromDb(row);

    expect(entry).toEqual({
      id: 'entry-1',
      title: 'Morning note',
      content: 'Feeling good',
      date: '2026-07-31',
      tagIds: ['tag-1'],
      entryType: 'free',
      reflectionPeriod: undefined,
      reflectionAnswers: undefined,
    });
  });

  it('maps reflection entry with answers from db', () => {
    const row: JournalEntryDbRow = {
      id: 'entry-2',
      userId: 'user-1',
      title: 'Weekly reflection',
      content: 'Summary',
      date: new Date('2026-07-30T00:00:00.000Z'),
      entryType: 'reflection',
      reflectionPeriod: 'week',
      reflectionAnswers: ['Answer 1', 'Answer 2', 'Answer 3'],
      tagIds: [],
      createdAt: new Date('2026-07-30T10:00:00.000Z'),
      updatedAt: new Date('2026-07-30T10:00:00.000Z'),
    };

    const entry = mapJournalEntryFromDb(row);

    expect(entry.entryType).toBe('reflection');
    expect(entry.reflectionPeriod).toBe('week');
    expect(entry.reflectionAnswers).toEqual(['Answer 1', 'Answer 2', 'Answer 3']);
  });

  it('maps journal tag from db', () => {
    const row: JournalTagDbRow = {
      id: 'tag-1',
      userId: 'user-1',
      name: 'Reflection',
      createdAt: new Date('2026-07-31T10:00:00.000Z'),
    };

    expect(mapJournalTagFromDb(row)).toEqual({
      id: 'tag-1',
      name: 'Reflection',
    });
  });
});
