import { describe, expect, it } from 'vitest';
import { buildAbstinenceClock } from '@/shared/lib/ascent/abstinence';

const ZONE = 'Europe/Minsk';

describe('abstinence clock', () => {
  it('counts down until the stored start and does not invent a running streak', () => {
    const startsAt = new Date('2026-11-24T21:00:00.000Z');
    const clock = buildAbstinenceClock({
      startsAt,
      timezone: ZONE,
      status: 'active',
      now: new Date('2026-11-22T10:00:00.000Z'),
      failedLocalDates: [],
      successfulLocalDates: [],
      openDayFailed: false,
    });

    expect(clock).toEqual({
      mode: 'countdown',
      startedAt: null,
      boundaryAt: '2026-11-24T21:00:00.000Z',
    });
  });

  it('keeps the original start while closed days are successful and today is still open', () => {
    const startsAt = new Date('2026-11-20T10:00:00.000Z');
    const clock = buildAbstinenceClock({
      startsAt,
      timezone: ZONE,
      status: 'active',
      now: new Date('2026-11-22T10:00:00.000Z'),
      failedLocalDates: [],
      successfulLocalDates: ['2026-11-20', '2026-11-21'],
      openDayFailed: false,
    });

    expect(clock.mode).toBe('running');
    expect(clock.startedAt).toBe(startsAt.toISOString());
    expect(clock.boundaryAt).toBe('2026-11-22T21:00:00.000Z');
  });

  it('starts the next period at local midnight after the latest failure', () => {
    const startsAt = new Date('2026-11-20T10:00:00.000Z');
    const clock = buildAbstinenceClock({
      startsAt,
      timezone: ZONE,
      status: 'active',
      now: new Date('2026-11-24T10:00:00.000Z'),
      failedLocalDates: ['2026-11-21', '2026-11-23'],
      successfulLocalDates: ['2026-11-20', '2026-11-22'],
      openDayFailed: false,
    });

    expect(clock.mode).toBe('running');
    expect(clock.startedAt).toBe('2026-11-23T21:00:00.000Z');
    expect(clock.startedAt).not.toBe(startsAt.toISOString());
  });

  it('stops the open day after a violation without waiting for the successful-day count', () => {
    const clock = buildAbstinenceClock({
      startsAt: new Date('2026-11-20T10:00:00.000Z'),
      timezone: ZONE,
      status: 'active',
      now: new Date('2026-11-22T10:00:00.000Z'),
      failedLocalDates: [],
      successfulLocalDates: ['2026-11-20', '2026-11-21'],
      openDayFailed: true,
    });

    expect(clock).toEqual({
      mode: 'broken',
      startedAt: null,
      boundaryAt: '2026-11-22T21:00:00.000Z',
    });
  });

  it('freezes a completed series at the end of its last successful day', () => {
    const clock = buildAbstinenceClock({
      startsAt: new Date('2026-11-20T10:00:00.000Z'),
      timezone: ZONE,
      status: 'completed',
      now: new Date('2026-11-25T10:00:00.000Z'),
      failedLocalDates: ['2026-11-21'],
      successfulLocalDates: ['2026-11-20', '2026-11-22', '2026-11-23'],
      openDayFailed: false,
    });

    expect(clock).toEqual({
      mode: 'frozen',
      startedAt: '2026-11-21T21:00:00.000Z',
      boundaryAt: '2026-11-23T21:00:00.000Z',
    });
  });

  it('counts from an earlier abstinence instant without starting the challenge early', () => {
    const startsAt = new Date('2026-11-22T10:00:00.000Z');
    const abstinenceStartedAt = new Date('2026-11-21T15:30:00.000Z');
    const running = buildAbstinenceClock({
      startsAt,
      abstinenceStartedAt,
      timezone: ZONE,
      status: 'active',
      now: new Date('2026-11-22T12:00:00.000Z'),
      failedLocalDates: [],
      successfulLocalDates: [],
      openDayFailed: false,
    });
    expect(running.mode).toBe('running');
    expect(running.startedAt).toBe(abstinenceStartedAt.toISOString());

    const waiting = buildAbstinenceClock({
      startsAt: new Date('2026-11-25T21:00:00.000Z'),
      abstinenceStartedAt,
      timezone: ZONE,
      status: 'active',
      now: new Date('2026-11-22T12:00:00.000Z'),
      failedLocalDates: [],
      successfulLocalDates: [],
      openDayFailed: false,
    });
    expect(waiting).toEqual({
      mode: 'countdown',
      startedAt: null,
      boundaryAt: '2026-11-25T21:00:00.000Z',
    });
  });
});
