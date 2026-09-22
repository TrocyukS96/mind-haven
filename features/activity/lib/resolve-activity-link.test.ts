import { describe, expect, it } from 'vitest';
import { resolveActivityLink } from './resolve-activity-link';
import type { ActivityEvent } from '@/entities/activity/model/types';

function event(type: string, entityId: string): ActivityEvent {
  return {
    id: 'event-1',
    type,
    entityType: type.split('_')[0] ?? 'TASK',
    entityId,
    title: 'Title',
    metadata: {},
    createdAt: '2026-09-22T09:42:00.000Z',
  };
}

const emptyStore = {
  journalEntries: [],
  tasks: [],
  goals: [],
  habits: [],
  energyCheckIns: [],
};

describe('resolveActivityLink', () => {
  it('returns no link when the source entity is gone', () => {
    expect(resolveActivityLink(event('TASK_COMPLETED', 'missing'), emptyStore as never)).toBeNull();
  });

  it('links to an existing journal entry', () => {
    expect(
      resolveActivityLink(event('JOURNAL_ENTRY_CREATED', 'entry-1'), {
        ...emptyStore,
        journalEntries: [{ id: 'entry-1' }],
      } as never)
    ).toEqual({ kind: 'journal', entryId: 'entry-1' });
  });
});
