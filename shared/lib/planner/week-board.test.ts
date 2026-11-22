import { describe, expect, it } from 'vitest';
import { calculateCompletionProgress } from '@/shared/lib/planner/calculate-progress';
import {
  allowedPlacementTaskIds,
  buildWeekLanes,
  canMutateWeekColumn,
  canReadWeekColumn,
  keyToPlannedDate,
  layoutPatchFromLanes,
  plannedDateToKey,
  weekBoardProgress,
  weekDayKeys,
} from '@/shared/lib/planner/week-board';

const weekId = 'week-1';
const columns = [{ id: weekId, legacyKey: null }];
const days = ['2026-11-23', '2026-11-24'];

describe('week day keys', () => {
  it('lists each local day of the week range', () => {
    const from = new Date(2026, 10, 23, 0, 0, 0, 0);
    const to = new Date(2026, 10, 29, 23, 59, 59, 999);
    expect(weekDayKeys(from.toISOString(), to.toISOString())).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
    ]);
  });

  it('round-trips a calendar day through UTC noon', () => {
    expect(plannedDateToKey(keyToPlannedDate('2026-11-23'))).toBe('2026-11-23');
  });
});

describe('week lanes', () => {
  it('puts a monday local task on that day and a backlog task on the week backlog', () => {
    const lanes = buildWeekLanes(
      days,
      [],
      [
        { id: 'mon', plannedDate: '2026-11-23', sortOrder: 0, status: 'todo' },
        { id: 'later', plannedDate: null, sortOrder: 0, status: 'todo' },
      ],
      []
    );

    expect(lanes['2026-11-23'].map((card) => card.id)).toEqual(['mon']);
    expect(lanes.backlog.map((card) => card.id)).toEqual(['later']);
  });

  it('moves a local task to another day without creating a main-task copy', () => {
    const lanes = buildWeekLanes(
      days,
      [{ id: 'main-1', userId: 'user-a', columnId: weekId, completed: false, kanbanOrder: 0 }],
      [{ id: 'local-1', plannedDate: '2026-11-23', sortOrder: 1, status: 'todo' }],
      [{ taskId: 'main-1', plannedDate: '2026-11-23', sortOrder: 0 }]
    );
    lanes['2026-11-23'] = lanes['2026-11-23'].filter((card) => card.id !== 'local-1');
    lanes['2026-11-24'] = [{ kind: 'local', id: 'local-1', sortOrder: 0 }];

    const patch = layoutPatchFromLanes(lanes);

    expect(patch.localTasks).toContainEqual({
      id: 'local-1',
      plannedDate: '2026-11-24',
      sortOrder: 0,
    });
    expect(patch.placements).toEqual([
      { taskId: 'main-1', plannedDate: '2026-11-23', sortOrder: 0 },
    ]);
    expect(JSON.stringify(patch)).not.toContain('columnId');
    expect(patch.placements.every((item) => !('title' in item))).toBe(true);
  });
});

describe('week progress', () => {
  it('counts main and local tasks separately from goal progress', () => {
    const main = [{ completed: true }, { completed: false }];
    const local = [{ status: 'done' }, { status: 'todo' }, { status: 'in_progress' }];
    const progress = weekBoardProgress(main, local);

    expect(progress.main).toEqual({ completed: 1, total: 2 });
    expect(progress.local).toEqual({ completed: 1, total: 3 });
    expect(progress.overallPercent).toBe(40);
    expect(calculateCompletionProgress(main)).toBe(60);
  });
});

describe('week access', () => {
  it('allows the owner to read an archived week and blocks edits', () => {
    const column = { userId: 'user-a', archivedAt: '2026-11-22T00:00:00.000Z' };
    expect(canReadWeekColumn(column, 'user-a')).toBe(true);
    expect(canMutateWeekColumn(column, 'user-a')).toBe(false);
  });

  it('hides another user from the week and from its main-task placements', () => {
    expect(canReadWeekColumn({ userId: 'user-a' }, 'user-b')).toBe(false);
    const allowed = allowedPlacementTaskIds(
      [
        { id: 'mine', userId: 'user-a', columnId: weekId },
        { id: 'theirs', userId: 'user-b', columnId: weekId },
        { id: 'other-column', userId: 'user-a', columnId: 'week-2' },
      ],
      [...columns, { id: 'week-2', legacyKey: null }],
      weekId,
      'user-a'
    );
    expect([...allowed]).toEqual(['mine']);
  });
});
