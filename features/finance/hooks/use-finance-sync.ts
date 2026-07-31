'use client';

import { useEffect } from 'react';
import type { FinanceAccount, FinanceTransaction } from '@/entities/finance/model/types';
import { isAuthenticatedUser } from '@/entities/user';
import { useAccess } from '@/features/access';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';

interface UseFinanceSyncOptions {
  initialAccounts?: FinanceAccount[] | null;
  initialTransactions?: FinanceTransaction[] | null;
}

export function useFinanceSync({
  initialAccounts = null,
  initialTransactions = null,
}: UseFinanceSyncOptions = {}) {
  const hydrated = useStoreHydrated();
  const { profile } = useAccess();
  const hydrateFinance = useStore((state) => state.hydrateFinance);
  const isAuthenticated = isAuthenticatedUser(profile);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !initialAccounts || !initialTransactions) {
      return;
    }

    hydrateFinance({ accounts: initialAccounts, transactions: initialTransactions });
  }, [hydrateFinance, hydrated, initialAccounts, initialTransactions, isAuthenticated]);
}
