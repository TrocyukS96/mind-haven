import type {
  EnergyAnswerInput,
  EnergyCheckIn,
  EnergyPeriodRange,
  EnergyPeriodStats,
  EnergyTestSnapshot,
} from '@/entities/energy/model/types';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }

  return payload;
}

export async function fetchEnergyTest(): Promise<EnergyTestSnapshot> {
  const response = await fetch('/api/energy/test');
  const payload = await parseResponse<{ test: EnergyTestSnapshot }>(response);
  return payload.test;
}

export async function fetchEnergyCheckIns(
  range?: EnergyPeriodRange
): Promise<{
  checkIns: EnergyCheckIn[];
  latest: EnergyCheckIn | null;
  stats: EnergyPeriodStats;
}> {
  const params = new URLSearchParams();

  if (range?.from) {
    params.set('from', range.from);
  }

  if (range?.to) {
    params.set('to', range.to);
  }

  const query = params.toString();
  const response = await fetch(`/api/energy/check-ins${query ? `?${query}` : ''}`);
  return parseResponse(response);
}

export async function createEnergyCheckInRequest(
  answers: EnergyAnswerInput[]
): Promise<EnergyCheckIn> {
  const response = await fetch('/api/energy/check-ins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  const payload = await parseResponse<{ checkIn: EnergyCheckIn }>(response);
  return payload.checkIn;
}
