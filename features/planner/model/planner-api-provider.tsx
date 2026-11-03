'use client';

import { useLayoutEffect } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import { setPlannerApiEnabled } from '@/entities/planner/lib/resolve-planner-api';
import { useAccess } from '@/features/access';
import { usePlannerSync } from '@/features/planner/hooks/use-planner-sync';
import type { PlannerData } from '@/shared/lib/planner/planner-merge';
import { useStore } from '@/shared/store/store-config';

interface PlannerApiProviderProps {
  initialPlanner?: PlannerData | null;
  children: React.ReactNode;
}

export function PlannerApiProvider({ initialPlanner = null, children }: PlannerApiProviderProps) {
  const { profile } = useAccess();
  const enabled = isAuthenticatedUser(profile);
  const setPlannerApiEnabledInStore = useStore((state) => state.setPlannerApiEnabled);

  setPlannerApiEnabled(enabled);
  usePlannerSync({ initialPlanner });

  useLayoutEffect(() => {
    setPlannerApiEnabled(enabled);
    setPlannerApiEnabledInStore(enabled);
  }, [enabled, setPlannerApiEnabledInStore]);

  return children;
}
