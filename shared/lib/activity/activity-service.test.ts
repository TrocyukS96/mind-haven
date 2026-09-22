import { describe, expect, it } from 'vitest';
import { encodeActivityCursor, mapActivityEventFromDb } from './activity-service';

describe('activity-service mappers', () => {
  it('maps an activity event from db without duplicating the source entity', () => {
    const event = mapActivityEventFromDb({
      id: 'act-1',
      userId: 'user-1',
      type: 'TASK_COMPLETED',
      entityType: 'TASK',
      entityId: 'task-1',
      title: 'Finish journal',
      metadata: { title: 'Finish journal', goalId: 'goal-1' },
      idempotencyKey: 'task:task-1:completed:1',
      createdAt: new Date('2026-09-22T09:42:00.000Z'),
    });

    expect(event).toEqual({
      id: 'act-1',
      type: 'TASK_COMPLETED',
      entityType: 'TASK',
      entityId: 'task-1',
      title: 'Finish journal',
      metadata: { title: 'Finish journal', goalId: 'goal-1' },
      createdAt: '2026-09-22T09:42:00.000Z',
    });
  });

  it('encodes a pagination cursor from createdAt and id', () => {
    expect(
      encodeActivityCursor({
        id: 'act-1',
        createdAt: '2026-09-22T09:42:00.000Z',
      })
    ).toBe('2026-09-22T09:42:00.000Z::act-1');
  });
});
