import { describe, expect, it } from 'vitest';
import {
  computeNextWeekRange,
  dateInputToIso,
  findOverlappingWeek,
  formatWeekTitle,
  isPastWeekColumn,
  mergeReorderedVisibleColumns,
  rangesOverlap,
} from './week-column-range';

describe('week column ranges', () => {
  it('formats a Monday–Sunday title', () => {
    expect(formatWeekTitle(new Date(2026, 10, 23), new Date(2026, 10, 29))).toBe('23.11–29.11.2026');
  });

  it('creates the next calendar week when no week columns exist', () => {
    const range = computeNextWeekRange([], new Date(2026, 10, 21, 15, 0, 0));
    expect(range.dateFrom.getFullYear()).toBe(2026);
    expect(range.dateFrom.getMonth()).toBe(10);
    expect(range.dateFrom.getDate()).toBe(23);
    expect(range.dateFrom.getDay()).toBe(1);
    expect(range.dateTo.getDate()).toBe(29);
    expect(range.dateTo.getDay()).toBe(0);
  });

  it('skips an existing week and does not duplicate it', () => {
    const existing = computeNextWeekRange([], new Date(2026, 10, 21));
    const next = computeNextWeekRange(
      [
        {
          id: 'week-1',
          kind: 'week',
          dateFrom: existing.dateFrom.toISOString(),
          dateTo: existing.dateTo.toISOString(),
        },
      ],
      new Date(2026, 10, 21)
    );

    expect(findOverlappingWeek(
      [
        {
          id: 'week-1',
          kind: 'week',
          dateFrom: existing.dateFrom.toISOString(),
          dateTo: existing.dateTo.toISOString(),
        },
      ],
      next.dateFrom,
      next.dateTo
    )).toBeUndefined();
    expect(next.dateFrom.getDate()).toBe(30);
    expect(next.dateTo.getDate()).toBe(6);
    expect(next.dateTo.getMonth()).toBe(11);
  });

  it('continues after the latest future week instead of filling a past gap', () => {
    const range = computeNextWeekRange(
      [
        {
          id: 'old',
          kind: 'week',
          dateFrom: new Date(2026, 10, 2).toISOString(),
          dateTo: new Date(2026, 10, 8, 23, 59, 59, 999).toISOString(),
        },
        {
          id: 'future',
          kind: 'week',
          dateFrom: new Date(2026, 11, 7).toISOString(),
          dateTo: new Date(2026, 11, 13, 23, 59, 59, 999).toISOString(),
        },
      ],
      new Date(2026, 10, 21)
    );

    expect(range.dateFrom.getMonth()).toBe(11);
    expect(range.dateFrom.getDate()).toBe(14);
  });

  it('detects overlapping ranges and ignores archived weeks', () => {
    const columns = [
      {
        id: 'archived',
        kind: 'week',
        archivedAt: '2026-11-01T00:00:00.000Z',
        dateFrom: new Date(2026, 10, 23).toISOString(),
        dateTo: new Date(2026, 10, 29, 23, 59, 59, 999).toISOString(),
      },
    ];
    const from = new Date(2026, 10, 23);
    const to = new Date(2026, 10, 29, 23, 59, 59, 999);
    expect(rangesOverlap(from, to, from, to)).toBe(true);
    expect(findOverlappingWeek(columns, from, to)).toBeUndefined();
  });

  it('treats a week that ended before today as past', () => {
    expect(
      isPastWeekColumn(
        { kind: 'week', dateTo: new Date(2026, 10, 15, 23, 59, 59, 999).toISOString() },
        new Date(2026, 10, 21)
      )
    ).toBe(true);
    expect(
      isPastWeekColumn(
        { kind: 'week', dateTo: new Date(2026, 10, 22, 23, 59, 59, 999).toISOString() },
        new Date(2026, 10, 21)
      )
    ).toBe(false);
  });

  it('keeps hidden columns in place while reordering visible ones', () => {
    expect(mergeReorderedVisibleColumns(
      ['backlog', 'hidden', 'a', 'b'],
      ['backlog', 'a', 'b'],
      ['backlog', 'b', 'a']
    )).toEqual(['backlog', 'hidden', 'b', 'a']);
  });

  it('parses a local date input without shifting the calendar day', () => {
    const iso = dateInputToIso('2026-11-23', 'start');
    expect(iso).toBeTruthy();
    const date = new Date(iso as string);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10);
    expect(date.getDate()).toBe(23);
    expect(date.getHours()).toBe(0);
  });
});
