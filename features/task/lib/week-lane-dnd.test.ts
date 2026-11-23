import { describe, expect, it } from 'vitest';
import { laneDropId, placeCardInLanes } from '@/features/task/lib/week-lane-dnd';

const monday = '2026-11-23';
const tuesday = '2026-11-24';
const wednesday = '2026-11-25';

describe('week lane drag', () => {
  const lanes = {
    backlog: [],
    [monday]: ['main:today'],
    [tuesday]: ['local:a', 'local:b'],
    [wednesday]: [],
  };

  it('moves a task from a day back to the empty week backlog', () => {
    expect(placeCardInLanes(lanes, 'main:today', laneDropId('backlog'))).toEqual({
      backlog: ['main:today'],
      [monday]: [],
      [tuesday]: ['local:a', 'local:b'],
      [wednesday]: [],
    });
  });

  it('moves a task from one day onto a card in another day', () => {
    expect(placeCardInLanes(lanes, 'local:b', 'main:today')).toEqual({
      backlog: [],
      [monday]: ['local:b', 'main:today'],
      [tuesday]: ['local:a'],
      [wednesday]: [],
    });
  });

  it('moves a task from a day into an empty day', () => {
    expect(placeCardInLanes(lanes, 'local:a', laneDropId(wednesday))).toEqual({
      backlog: [],
      [monday]: ['main:today'],
      [tuesday]: ['local:b'],
      [wednesday]: ['local:a'],
    });
  });
});
