'use client';

import { useEffect } from 'react';
import type { JournalData } from '@/shared/lib/journal/journal-entry-service';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { isAuthenticatedUser } from '@/entities/user';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';

interface UseJournalSyncOptions {
  initialData?: JournalData | null;
}

export function useJournalSync({ initialData = null }: UseJournalSyncOptions = {}) {
  const hydrated = useStoreHydrated();
  const { profile } = useAccess();
  const hydrateJournalData = useStore((state) => state.hydrateJournalData);
  const isAuthenticated = isAuthenticatedUser(profile);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !initialData) {
      return;
    }

    hydrateJournalData(initialData);
  }, [hydrateJournalData, hydrated, initialData, isAuthenticated]);
}
