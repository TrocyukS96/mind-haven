'use client';

import { useEffect } from 'react';
import type { Habit } from '@/entities/habit/model/types';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { isAuthenticatedUser } from '@/entities/user';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';

interface UseHabitSyncOptions {
  initialHabits?: Habit[] | null;
}

export function useHabitSync({ initialHabits = null }: UseHabitSyncOptions = {}) {
  const hydrated = useStoreHydrated();
  const { profile } = useAccess();
  const hydrateHabits = useStore((state) => state.hydrateHabits);
  const isAuthenticated = isAuthenticatedUser(profile);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !initialHabits) {
      return;
    }

    hydrateHabits(initialHabits);
  }, [hydrateHabits, hydrated, initialHabits, isAuthenticated]);
}
