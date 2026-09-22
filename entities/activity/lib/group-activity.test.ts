import { describe, expect, it } from 'vitest';
import { groupActivityByDate } from './group-activity';
import type { ActivityEvent } from '../model/types';

function event(id: string, createdAt: string): ActivityEvent {
  return {
    id,
    type: 'TASK_COMPLETED',
    entityType: 'TASK',
    entityId: id,
    title: id,
    metadata: {},
    createdAt,
  };
}

describe('groupActivityByDate', () => {
  it('groups events by local date without creating empty days', () => {
    const groups = groupActivityByDate([
      event('1', '2026-09-22T09:42:00.000Z'),
      event('2', '2026-09-22T11:15:00.000Z'),
      event('3', '2026-09-21T08:45:00.000Z'),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.events.map((item) => item.id)).toEqual(['1', '2']);
    expect(groups[1]?.events.map((item) => item.id)).toEqual(['3']);
  });
});
