import type { JournalEntry, JournalTag } from '@/entities/journal/model/types';
import type { JournalEntryInput, JournalData } from '@/shared/lib/journal/journal-entry-service';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }

  return payload;
}

export async function fetchJournalData(): Promise<JournalData> {
  const response = await fetch('/api/journal/entries');
  return parseResponse<JournalData>(response);
}

export async function createJournalEntryRequest(
  input: JournalEntryInput
): Promise<JournalEntry> {
  const response = await fetch('/api/journal/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ entry: JournalEntry }>(response);
  return payload.entry;
}

export async function updateJournalEntryRequest(
  id: string,
  input: Partial<JournalEntryInput>
): Promise<JournalEntry> {
  const response = await fetch(`/api/journal/entries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ entry: JournalEntry }>(response);
  return payload.entry;
}

export async function deleteJournalEntryRequest(id: string): Promise<void> {
  const response = await fetch(`/api/journal/entries/${id}`, {
    method: 'DELETE',
  });
  await parseResponse<{ ok: true }>(response);
}

export async function createJournalTagRequest(name: string): Promise<JournalTag> {
  const response = await fetch('/api/journal/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const payload = await parseResponse<{ tag: JournalTag }>(response);
  return payload.tag;
}
