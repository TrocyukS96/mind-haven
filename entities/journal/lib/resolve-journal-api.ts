import { getSession } from 'next-auth/react';

let journalApiEnabled = false;

export function setJournalApiEnabled(enabled: boolean) {
  journalApiEnabled = enabled;
}

export function isJournalApiEnabled() {
  return journalApiEnabled;
}

export async function shouldUseJournalApi(): Promise<boolean> {
  if (journalApiEnabled) {
    return true;
  }

  const session = await getSession();
  return Boolean(session?.user?.id);
}
