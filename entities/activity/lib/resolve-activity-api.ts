import { getSession } from 'next-auth/react';

let activityApiEnabled = false;

export function setActivityApiEnabled(enabled: boolean) {
  activityApiEnabled = enabled;
}

export function isActivityApiEnabled() {
  return activityApiEnabled;
}

export async function shouldUseActivityApi(): Promise<boolean> {
  if (activityApiEnabled) {
    return true;
  }

  const session = await getSession();
  return Boolean(session?.user?.id);
}
