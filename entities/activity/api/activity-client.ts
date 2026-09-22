import type {
  ActivityEvent,
  ActivityEventInput,
  ActivityFilterState,
  ActivityListResult,
} from '../model/types';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }

  return payload;
}

export interface FetchActivityParams {
  cursor?: string | null;
  limit?: number;
  filter?: ActivityFilterState;
}

export async function fetchActivityEvents(
  params: FetchActivityParams = {}
): Promise<ActivityListResult> {
  const searchParams = new URLSearchParams();

  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const filter = params.filter;
  if (filter?.dateFrom) {
    searchParams.set('from', filter.dateFrom);
  }
  if (filter?.dateTo) {
    searchParams.set('to', filter.dateTo);
  }
  if (filter?.category && filter.category !== 'all') {
    searchParams.set('category', filter.category);
  }
  if (filter?.search.trim()) {
    searchParams.set('search', filter.search.trim());
  }

  const query = searchParams.toString();
  const response = await fetch(query ? `/api/activity?${query}` : '/api/activity');
  return parseResponse<ActivityListResult>(response);
}

export async function createActivityEventRequest(
  input: ActivityEventInput
): Promise<ActivityEvent> {
  const response = await fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ event: ActivityEvent }>(response);
  return payload.event;
}
