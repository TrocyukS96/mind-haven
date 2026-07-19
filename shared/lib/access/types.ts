import type { UserRole } from '@/entities/user';
import type { FeatureKey } from '@/shared/config/features';

export interface AccessContext {
  role: UserRole;
  hasActiveSubscription: boolean;
  grantedFeatures: FeatureKey[];
  globalFeatureFlags: Record<FeatureKey, boolean>;
}

export type AccessDenyReason =
  | 'role'
  | 'subscription'
  | 'disabled'
  | 'auth_required';

export interface AccessResult {
  allowed: boolean;
  reason?: AccessDenyReason;
}
