import { describe, expect, it } from 'vitest';
import {
  assertIsoDate,
  assertTimeZone,
  assertTimezoneUnchanged,
  eachLocalDate,
  formatLocalDate,
  formatLocalTime,
  instantOnLocalDate,
  resolveAbstinenceStartedAt,
  resolveChallengeStartsAt,
  shiftIsoDate,
  startOfLocalDay,
} from '@/shared/lib/ascent/local-date';
import { AscentRuleError } from '@/shared/lib/ascent/errors';

describe('ascent local dates', () => {
  it('shifts calendar dates without using the server timezone, including leap day', () => {
    expect(shiftIsoDate('2026-02-28', 1)).toBe('2026-03-01');
    expect(shiftIsoDate('2024-02-28', 1)).toBe('2024-02-29');
    expect(shiftIsoDate('2024-02-29', 1)).toBe('2024-03-01');
    expect(shiftIsoDate('2026-11-30', 1)).toBe('2026-12-01');
    expect(eachLocalDate('2026-03-28', '2026-03-30')).toEqual([
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
    ]);
  });

  it('rejects impossible dates and unknown timezones', () => {
    expect(() => assertIsoDate('2026-02-29')).toThrow(AscentRuleError);
    expect(() => assertTimeZone('Not/AZone')).toThrow(AscentRuleError);
    expect(() => assertTimezoneUnchanged('Europe/Minsk', 'UTC')).toThrow(AscentRuleError);
  });

  it('keeps Minsk midnight on the local calendar date', () => {
    expect(formatLocalDate(new Date('2026-11-22T20:59:00.000Z'), 'Europe/Minsk')).toBe('2026-11-22');
    expect(formatLocalDate(new Date('2026-11-22T21:00:00.000Z'), 'Europe/Minsk')).toBe('2026-11-23');
  });

  it('gives the same instant different dates across the date line', () => {
    const instant = new Date('2026-11-22T12:00:00.000Z');
    expect(formatLocalDate(instant, 'Pacific/Kiritimati')).toBe('2026-11-23');
    expect(formatLocalDate(instant, 'Pacific/Pago_Pago')).toBe('2026-11-22');
  });

  it('rejects a past start and keeps a future start on that local date', () => {
    const now = new Date('2026-11-22T10:00:00.000Z');
    expect(() => resolveChallengeStartsAt(now, 'Europe/Minsk', '2026-11-21')).toThrow(AscentRuleError);
    expect(resolveChallengeStartsAt(now, 'Europe/Minsk', '2026-11-22')).toBe(now);

    const future = resolveChallengeStartsAt(now, 'Europe/Minsk', '2026-11-25');
    expect(future.toISOString()).toBe('2026-11-24T21:00:00.000Z');
    expect(formatLocalDate(future, 'Europe/Minsk')).toBe('2026-11-25');
    expect(future.getTime()).toBeGreaterThan(now.getTime());
    expect(formatLocalDate(instantOnLocalDate('2026-11-23', 'Pacific/Kiritimati'), 'Pacific/Kiritimati')).toBe(
      '2026-11-23'
    );
  });

  it('resolves local midnight without using the server timezone', () => {
    expect(startOfLocalDay('2026-11-23', 'Europe/Minsk').toISOString()).toBe('2026-11-22T21:00:00.000Z');
    expect(startOfLocalDay('2026-03-29', 'Europe/Berlin').toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(startOfLocalDay('2026-10-25', 'Europe/Berlin').toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(startOfLocalDay('2026-11-23', 'Pacific/Kiritimati').toISOString()).toBe('2026-11-22T10:00:00.000Z');
    expect(startOfLocalDay('2026-11-23', 'Pacific/Pago_Pago').toISOString()).toBe('2026-11-23T11:00:00.000Z');
  });

  it('does not skip or duplicate a calendar date around Europe DST', () => {
    expect(formatLocalDate(new Date('2026-03-28T23:30:00.000Z'), 'Europe/Berlin')).toBe('2026-03-29');
    expect(formatLocalDate(new Date('2026-03-29T22:30:00.000Z'), 'Europe/Berlin')).toBe('2026-03-30');
    expect(formatLocalDate(new Date('2026-10-24T23:30:00.000Z'), 'Europe/Berlin')).toBe('2026-10-25');
    expect(formatLocalDate(new Date('2026-10-25T00:30:00.000Z'), 'Europe/Berlin')).toBe('2026-10-25');
    expect(formatLocalDate(new Date('2026-10-25T23:30:00.000Z'), 'Europe/Berlin')).toBe('2026-10-26');
  });

  it('resolves an abstinence wall time and rejects a future one', () => {
    const now = new Date('2026-11-22T10:00:00.000Z');
    const started = resolveAbstinenceStartedAt({
      now,
      timeZone: 'Europe/Minsk',
      date: '2026-11-21',
      time: '18:30',
    });
    expect(started.toISOString()).toBe('2026-11-21T15:30:00.000Z');
    expect(formatLocalTime(started, 'Europe/Minsk')).toBe('18:30');
    expect(formatLocalDate(started, 'Europe/Minsk')).toBe('2026-11-21');
    expect(() => resolveAbstinenceStartedAt({ now, timeZone: 'Europe/Minsk', date: '2026-11-22', time: '18:00' })).toThrow(
      AscentRuleError
    );
  });
});
