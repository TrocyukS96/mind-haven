import { describe, expect, it } from 'vitest';
import type { EnergyCheckIn } from '../model/types';
import { getEnergyPeriodStats, getLatestEnergyCheckIn } from './energy-history';

function checkIn(id: string, score: number, createdAt: string): EnergyCheckIn {
  return {
    id,
    userId: 'user-1',
    testVersionId: 'energy-test-v1',
    score,
    createdAt,
    answers: [],
  };
}

describe('energy history', () => {
  const checkIns = [
    checkIn('c1', 6.1, '2026-01-08T10:00:00.000Z'),
    checkIn('c2', 4.2, '2026-01-10T10:00:00.000Z'),
    checkIn('c3', 5.0, '2026-01-12T10:00:00.000Z'),
    checkIn('c4', 7.4, '2026-01-20T10:00:00.000Z'),
  ];

  it('uses the latest check-in as the current energy level', () => {
    expect(getLatestEnergyCheckIn(checkIns)?.id).toBe('c4');
    expect(getLatestEnergyCheckIn(checkIns)?.score).toBe(7.4);
  });

  it('summarizes a period without mixing in later versions as source of truth', () => {
    const stats = getEnergyPeriodStats(checkIns, {
      from: '2026-01-08T00:00:00.000Z',
      to: '2026-01-14T23:59:59.000Z',
    });

    expect(stats.checkIns.map((item) => item.id)).toEqual(['c3', 'c2', 'c1']);
    expect(stats.average).toBe(5.1);
    expect(stats.min).toBe(4.2);
    expect(stats.max).toBe(6.1);
    expect(stats.latest?.id).toBe('c3');
  });
});
