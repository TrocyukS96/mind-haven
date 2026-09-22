'use client';

import { useLayoutEffect } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import { setActivityApiEnabled } from '@/entities/activity/lib/resolve-activity-api';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';

interface ActivityApiProviderProps {
  children: React.ReactNode;
}

export function ActivityApiProvider({ children }: ActivityApiProviderProps) {
  const { profile } = useAccess();
  const enabled = isAuthenticatedUser(profile);
  const setActivityApiEnabledInStore = useStore((state) => state.setActivityApiEnabled);

  setActivityApiEnabled(enabled);

  useLayoutEffect(() => {
    setActivityApiEnabled(enabled);
    setActivityApiEnabledInStore(enabled);
  }, [enabled, setActivityApiEnabledInStore]);

  return children;
}
