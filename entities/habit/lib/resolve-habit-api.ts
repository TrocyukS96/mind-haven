import { getSession } from 'next-auth/react';

let habitApiEnabled = false;

export function setHabitApiEnabled(enabled: boolean) {
  habitApiEnabled = enabled;
}

export function isHabitApiEnabled() {
  return habitApiEnabled;
}

export async function shouldUseHabitApi(): Promise<boolean> {
  if (habitApiEnabled) {
    return true;
  }

  const session = await getSession();
  return Boolean(session?.user?.id);
}
