import { describe, expect, it } from 'vitest';
import { columnDropId, placeTaskInColumns, resolveOverColumnId } from '@/features/task/lib/task-column-dnd';

describe('task column drag', () => {
  const columns = {
    backlog: ['task-a', 'task-b'],
    week: [],
    future: ['task-c'],
  };

  it('resolves an empty week column from its drop zone', () => {
    expect(resolveOverColumnId(columnDropId('week'), columns)).toBe('week');
  });

  it('moves a backlog task into an empty week column', () => {
    const next = placeTaskInColumns(columns, 'task-a', columnDropId('week'));

    expect(next).toEqual({
      backlog: ['task-b'],
      week: ['task-a'],
      future: ['task-c'],
    });
  });

  it('inserts a backlog task before an existing task in the week column', () => {
    const withWeekTask = {
      backlog: ['task-a'],
      week: ['task-b'],
    };

    expect(placeTaskInColumns(withWeekTask, 'task-a', 'task-b')).toEqual({
      backlog: [],
      week: ['task-a', 'task-b'],
    });
  });
});
