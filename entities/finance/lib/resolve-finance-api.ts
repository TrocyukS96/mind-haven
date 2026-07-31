import { getSession } from 'next-auth/react';

let financeApiEnabled = false;

export function setFinanceApiEnabled(enabled: boolean) {
  financeApiEnabled = enabled;
}

export function isFinanceApiEnabled() {
  return financeApiEnabled;
}

export async function shouldUseFinanceApi(): Promise<boolean> {
  if (financeApiEnabled) {
    return true;
  }

  const session = await getSession();
  return Boolean(session?.user?.id);
}
