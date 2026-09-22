'use client';

import { useLayoutEffect } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import { setEnergyApiEnabled } from '@/entities/energy/lib/resolve-energy-api';
import { useAccess } from '@/features/access';
import { useEnergySync } from '../hooks/use-energy-sync';
import { useStore } from '@/shared/store/store-config';

interface EnergyApiProviderProps {
  children: React.ReactNode;
}

export function EnergyApiProvider({ children }: EnergyApiProviderProps) {
  const { profile } = useAccess();
  const enabled = isAuthenticatedUser(profile);
  const setEnergyApiEnabledInStore = useStore((state) => state.setEnergyApiEnabled);

  setEnergyApiEnabled(enabled);

  useLayoutEffect(() => {
    setEnergyApiEnabled(enabled);
    setEnergyApiEnabledInStore(enabled);
  }, [enabled, setEnergyApiEnabledInStore]);

  useEnergySync();

  return children;
}
