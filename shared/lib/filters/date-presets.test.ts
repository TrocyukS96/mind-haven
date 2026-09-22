import { describe, expect, it } from 'vitest';
import { resolveDatePresetRange, toLocalDateString } from './date-presets';

describe('resolveDatePresetRange', () => {
  const now = new Date('2026-09-22T12:00:00');

  it('returns an empty range for all time', () => {
    expect(resolveDatePresetRange('all', {}, now)).toEqual({});
  });

  it('resolves today and yesterday in local dates', () => {
    expect(resolveDatePresetRange('today', {}, now)).toEqual({
      from: '2026-09-22',
      to: '2026-09-22',
    });
    expect(resolveDatePresetRange('yesterday', {}, now)).toEqual({
      from: '2026-09-21',
      to: '2026-09-21',
    });
  });

  it('resolves rolling week and month windows', () => {
    expect(resolveDatePresetRange('last7', {}, now)).toEqual({
      from: '2026-09-16',
      to: '2026-09-22',
    });
    expect(resolveDatePresetRange('last30', {}, now)).toEqual({
      from: '2026-08-24',
      to: '2026-09-22',
    });
  });

  it('keeps a custom range', () => {
    expect(
      resolveDatePresetRange('custom', { from: '2026-01-01', to: '2026-01-10' }, now)
    ).toEqual({
      from: '2026-01-01',
      to: '2026-01-10',
    });
  });

  it('formats local date strings', () => {
    expect(toLocalDateString(now)).toBe('2026-09-22');
  });
});
