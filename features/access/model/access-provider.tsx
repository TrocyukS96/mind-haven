'use client';

import type { AuthProfile } from '@/entities/user';
import type { FeatureKey } from '@/shared/config/features';
import type { AccessContext } from '@/shared/lib/access';
import {
  canAccess,
  canAccessFeature,
  getAccessibleFeatures,
} from '@/shared/lib/access';
import { createContext, useContext, useMemo } from 'react';

interface AccessProviderProps {
  profile: AuthProfile;
  globalFeatureFlags: Record<FeatureKey, boolean>;
  children: React.ReactNode;
}

interface AccessContextValue {
  profile: AuthProfile;
  accessContext: AccessContext;
  canAccess: (feature: FeatureKey) => ReturnType<typeof canAccess>;
  canAccessFeature: (feature: FeatureKey) => boolean;
  getAccessibleFeatures: (features: FeatureKey[]) => FeatureKey[];
}

const AccessReactContext = createContext<AccessContextValue | null>(null);

function buildAccessContext(
  profile: AuthProfile,
  globalFeatureFlags: Record<FeatureKey, boolean>
): AccessContext {
  if (profile.role === 'GUEST') {
    return {
      role: 'GUEST',
      hasActiveSubscription: false,
      grantedFeatures: [],
      globalFeatureFlags,
    };
  }

  return {
    role: profile.role,
    hasActiveSubscription: profile.hasActiveSubscription,
    grantedFeatures: profile.grantedFeatures as FeatureKey[],
    globalFeatureFlags,
  };
}

export function AccessProvider({
  profile,
  globalFeatureFlags,
  children,
}: AccessProviderProps) {
  const value = useMemo<AccessContextValue>(() => {
    const accessContext = buildAccessContext(profile, globalFeatureFlags);

    return {
      profile,
      accessContext,
      canAccess: (feature) => canAccess(accessContext, feature),
      canAccessFeature: (feature) => canAccessFeature(accessContext, feature),
      getAccessibleFeatures: (features) =>
        getAccessibleFeatures(accessContext, features),
    };
  }, [profile, globalFeatureFlags]);

  return (
    <AccessReactContext.Provider value={value}>
      {children}
    </AccessReactContext.Provider>
  );
}

export function useAccessContext(): AccessContextValue {
  const context = useContext(AccessReactContext);

  if (!context) {
    throw new Error('useAccessContext must be used within AccessProvider');
  }

  return context;
}
