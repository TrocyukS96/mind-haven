'use client';

import { useLayoutEffect } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import { setFinanceApiEnabled } from '@/entities/finance/lib/resolve-finance-api';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';

interface FinanceApiProviderProps {
  children: React.ReactNode;
}

export function FinanceApiProvider({ children }: FinanceApiProviderProps) {
  const { profile } = useAccess();
  const enabled = isAuthenticatedUser(profile);
  const setFinanceApiEnabledInStore = useStore((state) => state.setFinanceApiEnabled);

  setFinanceApiEnabled(enabled);

  useLayoutEffect(() => {
    setFinanceApiEnabled(enabled);
    setFinanceApiEnabledInStore(enabled);
  }, [enabled, setFinanceApiEnabledInStore]);

  return children;
}
