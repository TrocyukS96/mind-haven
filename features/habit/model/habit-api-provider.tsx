'use client';

import { useLayoutEffect } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import { setHabitApiEnabled } from '@/entities/habit/lib/resolve-habit-api';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';

interface HabitApiProviderProps {
  children: React.ReactNode;
}

export function HabitApiProvider({ children }: HabitApiProviderProps) {
  const { profile } = useAccess();
  const enabled = isAuthenticatedUser(profile);
  const setHabitApiEnabledInStore = useStore((state) => state.setHabitApiEnabled);

  setHabitApiEnabled(enabled);

  useLayoutEffect(() => {
    setHabitApiEnabled(enabled);
    setHabitApiEnabledInStore(enabled);
  }, [enabled, setHabitApiEnabledInStore]);

  return children;
}
