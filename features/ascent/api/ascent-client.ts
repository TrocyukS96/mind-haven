import type { AscentSetupPayload } from '@/features/ascent/model/wizard';

export class AscentRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = 'AscentRequestError';
    this.status = status;
    this.code = code;
  }
}

export interface AscentChallengeSummary {
  id: string;
  title: string;
  status: string;
  unwantedBehavior: string;
  targetDays: number;
  timezone: string;
}

export interface AscentSetupResult {
  challenge: AscentChallengeSummary;
  rewards: unknown[];
  triggers: unknown[];
  habits: unknown[];
  restrictions: Array<{ kind?: string }>;
  customDebts: unknown[];
  activities: unknown[];
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    return payload && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await readBody(response);
  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : 'Request failed';
    const code = typeof payload.code === 'string' ? payload.code : null;
    throw new AscentRequestError(message, response.status, code);
  }
  return payload as T;
}

export function setupAscentChallenge(body: AscentSetupPayload): Promise<AscentSetupResult> {
  return request<AscentSetupResult>('/api/ascent/challenges/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function fetchAscentChallenges(): Promise<AscentChallengeSummary[]> {
  const payload = await request<{ challenges?: AscentChallengeSummary[] }>('/api/ascent/challenges');
  return payload.challenges ?? [];
}

export function fetchAscentChallenge(id: string): Promise<AscentSetupResult> {
  return request<AscentSetupResult>(`/api/ascent/challenges/${id}`);
}
