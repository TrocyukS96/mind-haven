'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/shared/store/store-config';

export function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    return useStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
