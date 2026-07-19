import type { AuthProfile } from '@/entities/user';
import type { FeatureKey } from '@/shared/config/features';
import { auth } from '@/shared/lib/auth/auth';
import { prisma } from '@/shared/lib/db';

function isFeatureKey(value: string): value is FeatureKey {
  return [
    'dashboard',
    'goals',
    'tasks',
    'journal',
    'habits',
    'tables',
    'analytics',
    'ai_assistant',
    'profile',
    'admin_panel',
    'admin_feature_settings',
    'admin_manage_admins',
  ].includes(value);
}

export async function getSessionProfile(): Promise<AuthProfile> {
  const session = await auth();

  if (!session?.user?.id) {
    return { role: 'GUEST' };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscription: true,
      featureGrants: true,
    },
  });

  if (!user) {
    return { role: 'GUEST' };
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    hasActiveSubscription: user.subscription?.status === 'ACTIVE',
    grantedFeatures: user.featureGrants
      .map((grant) => grant.featureKey)
      .filter(isFeatureKey),
  };
}
