'use client';

import { useEffect } from 'react';
import type { FinanceBooks } from '@/entities/finance/model/types';
import { isAuthenticatedUser } from '@/entities/user';
import { useAccess } from '@/features/access';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';

interface UseFinanceSyncOptions {
  initialBooks?: FinanceBooks | null;
}

export function useFinanceSync({ initialBooks = null }: UseFinanceSyncOptions = {}) {
  const hydrated = useStoreHydrated();
  const { profile } = useAccess();
  const hydrateFinance = useStore((state) => state.hydrateFinance);
  const isAuthenticated = isAuthenticatedUser(profile);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !initialBooks) {
      return;
    }

    hydrateFinance(initialBooks);
  }, [hydrateFinance, hydrated, initialBooks, isAuthenticated]);
}
