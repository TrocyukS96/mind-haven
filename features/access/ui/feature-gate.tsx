'use client';

import type { FeatureKey } from '@/shared/config/features';
import { useAccessContext } from '../model/access-provider';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { canAccessFeature } = useAccessContext();

  if (!canAccessFeature(feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
