import { describe, expect, it } from 'vitest';
import { filterJournalEntries, sortJournalEntries } from './filter-journal-entries';
import type { JournalEntry } from '../model/types';

const entries: JournalEntry[] = [
  {
    id: '1',
    title: 'Morning note',
    content: 'Feeling good',
    date: '2026-09-22',
    tagIds: ['work'],
    updatedAt: '2026-09-22T10:00:00.000Z',
  },
  {
    id: '2',
    title: 'Evening thoughts',
    content: 'Need rest',
    date: '2026-09-20',
    tagIds: ['life'],
    updatedAt: '2026-09-21T10:00:00.000Z',
  },
];

describe('filterJournalEntries', () => {
  it('searches title and content case-insensitively', () => {
    expect(
      filterJournalEntries(entries, 'MORNING', { datePreset: 'all', tagIds: [] }).map((item) => item.id)
    ).toEqual(['1']);
    expect(
      filterJournalEntries(entries, 'rest', { datePreset: 'all', tagIds: [] }).map((item) => item.id)
    ).toEqual(['2']);
  });

  it('filters by tags using AND logic', () => {
    expect(
      filterJournalEntries(entries, '', { datePreset: 'all', tagIds: ['work'] }).map((item) => item.id)
    ).toEqual(['1']);
    expect(
      filterJournalEntries(entries, '', { datePreset: 'all', tagIds: ['work', 'life'] })
    ).toEqual([]);
  });
});

describe('sortJournalEntries', () => {
  it('sorts newest first by default date field', () => {
    expect(
      sortJournalEntries(entries, { field: 'date', direction: 'desc' }).map((item) => item.id)
    ).toEqual(['1', '2']);
  });
});
