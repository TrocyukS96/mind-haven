import type { EnergyCheckIn, EnergyPeriodRange, EnergyPeriodStats } from '../model/types';
import { roundEnergyScore } from './calculate-energy';

function toTimestamp(value: string): number {
  return new Date(value).getTime();
}

export function sortEnergyCheckIns(checkIns: EnergyCheckIn[]): EnergyCheckIn[] {
  return [...checkIns].sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
}

export function getLatestEnergyCheckIn(checkIns: EnergyCheckIn[]): EnergyCheckIn | null {
  return sortEnergyCheckIns(checkIns)[0] ?? null;
}

export function filterEnergyCheckInsByPeriod(
  checkIns: EnergyCheckIn[],
  range: EnergyPeriodRange
): EnergyCheckIn[] {
  const from = toTimestamp(range.from);
  const to = toTimestamp(range.to);

  return sortEnergyCheckIns(checkIns).filter((checkIn) => {
    const createdAt = toTimestamp(checkIn.createdAt);
    return createdAt >= from && createdAt <= to;
  });
}

function getPreviousPeriod(range: EnergyPeriodRange): EnergyPeriodRange {
  const from = toTimestamp(range.from);
  const to = toTimestamp(range.to);
  const duration = Math.max(0, to - from);

  return {
    from: new Date(from - duration).toISOString(),
    to: new Date(from - 1).toISOString(),
  };
}

function averageScore(checkIns: EnergyCheckIn[]): number | null {
  if (checkIns.length === 0) {
    return null;
  }

  const total = checkIns.reduce((sum, checkIn) => sum + checkIn.score, 0);
  return roundEnergyScore(total / checkIns.length);
}

export function getEnergyPeriodStats(
  checkIns: EnergyCheckIn[],
  range?: EnergyPeriodRange
): EnergyPeriodStats {
  const scoped = range ? filterEnergyCheckInsByPeriod(checkIns, range) : sortEnergyCheckIns(checkIns);
  const latest = getLatestEnergyCheckIn(range ? scoped : checkIns);
  const scores = scoped.map((checkIn) => checkIn.score);
  const previous = range ? filterEnergyCheckInsByPeriod(checkIns, getPreviousPeriod(range)) : [];
  const average = averageScore(scoped);
  const previousAverage = averageScore(previous);

  return {
    latest,
    latestCreatedAt: latest?.createdAt ?? null,
    checkIns: scoped,
    average,
    min: scores.length > 0 ? Math.min(...scores) : null,
    max: scores.length > 0 ? Math.max(...scores) : null,
    previousAverage,
    change:
      average === null || previousAverage === null
        ? null
        : roundEnergyScore(average - previousAverage),
  };
}
