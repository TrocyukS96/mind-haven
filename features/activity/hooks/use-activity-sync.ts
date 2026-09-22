'use client';

import { useEffect } from 'react';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';

export function useActivitySync(enabled: boolean) {
  const hydrated = useStoreHydrated();
  const loadActivityEvents = useStore((state) => state.loadActivityEvents);
  const filter = useStore((state) => state.activityFilter);

  useEffect(() => {
    if (!hydrated || !enabled) {
      return;
    }

    void loadActivityEvents({ reset: true });
  }, [
    enabled,
    filter.category,
    filter.dateFrom,
    filter.datePreset,
    filter.dateTo,
    filter.search,
    hydrated,
    loadActivityEvents,
  ]);
}
