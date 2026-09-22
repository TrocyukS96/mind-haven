'use client';

import { useEffect } from 'react';
import { fetchEnergyCheckIns, fetchEnergyTest } from '@/entities/energy/api/energy-client';
import { isAuthenticatedUser } from '@/entities/user';
import { useAccess } from '@/features/access';
import { getDefaultEnergyTestSnapshot } from '@/shared/config/energy-test';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';

export function useEnergySync() {
  const hydrated = useStoreHydrated();
  const { profile } = useAccess();
  const hydrateEnergy = useStore((state) => state.hydrateEnergy);
  const isAuthenticated = isAuthenticatedUser(profile);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!isAuthenticated) {
      hydrateEnergy({ test: getDefaultEnergyTestSnapshot() });
      return;
    }

    let cancelled = false;

    Promise.all([fetchEnergyTest(), fetchEnergyCheckIns()])
      .then(([test, data]) => {
        if (cancelled) {
          return;
        }

        hydrateEnergy({
          test,
          checkIns: data.checkIns,
        });
      })
      .catch(() => {
        if (!cancelled) {
          hydrateEnergy({ test: getDefaultEnergyTestSnapshot() });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrateEnergy, hydrated, isAuthenticated]);
}
