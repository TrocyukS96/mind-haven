import type { FeatureKey } from '@/shared/config/features';
import { canAccess } from '@/shared/lib/access/can-access';
import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';
import { getFeatureFlags } from '@/shared/lib/features/feature-service';
import { notFound } from 'next/navigation';

export default async function AscentLayout({ children }: { children: React.ReactNode }) {
  const [profile, globalFeatureFlags] = await Promise.all([getSessionProfile(), getFeatureFlags()]);
  const access = canAccess(
    profile.role === 'GUEST'
      ? { role: 'GUEST', hasActiveSubscription: false, grantedFeatures: [], globalFeatureFlags }
      : {
          role: profile.role,
          hasActiveSubscription: profile.hasActiveSubscription,
          grantedFeatures: profile.grantedFeatures as FeatureKey[],
          globalFeatureFlags,
        },
    'ascent'
  );

  if (!access.allowed && access.reason !== 'auth_required') {
    notFound();
  }

  return children;
}
