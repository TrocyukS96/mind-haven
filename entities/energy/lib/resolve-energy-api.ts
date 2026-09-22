import { getSession } from 'next-auth/react';

let energyApiEnabled = false;

export function setEnergyApiEnabled(enabled: boolean) {
  energyApiEnabled = enabled;
}

export function isEnergyApiEnabled() {
  return energyApiEnabled;
}

export async function shouldUseEnergyApi(): Promise<boolean> {
  if (energyApiEnabled) {
    return true;
  }

  const session = await getSession();
  return Boolean(session?.user?.id);
}
