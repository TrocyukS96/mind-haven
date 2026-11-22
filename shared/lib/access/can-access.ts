import { hasMinRole, isAdminRole } from '@/entities/user';
import {
  FEATURES,
  resolveFeatureEnabled,
  type FeatureKey,
} from '@/shared/config/features';
import type { AccessContext, AccessResult } from './types';

export function canAccess(
  context: AccessContext,
  feature: FeatureKey,
  nodeEnv: string | undefined = process.env.NODE_ENV
): AccessResult {
  const definition = FEATURES[feature];
  const stored = context.globalFeatureFlags[feature] ?? definition.defaultEnabled;
  const isGloballyEnabled = resolveFeatureEnabled(feature, stored, nodeEnv);

  if (!isGloballyEnabled && !isAdminRole(context.role)) {
    return { allowed: false, reason: 'disabled' };
  }

  if (!hasMinRole(context.role, definition.minRole)) {
    return {
      allowed: false,
      reason: definition.minRole === 'USER' ? 'auth_required' : 'role',
    };
  }

  if (!definition.requiresSubscription) {
    return { allowed: true };
  }

  if (isAdminRole(context.role)) {
    return { allowed: true };
  }

  if (context.hasActiveSubscription) {
    return { allowed: true };
  }

  if (context.grantedFeatures.includes(feature)) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'subscription' };
}

export function canAccessFeature(
  context: AccessContext,
  feature: FeatureKey,
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return canAccess(context, feature, nodeEnv).allowed;
}

export function getAccessibleFeatures(
  context: AccessContext,
  features: FeatureKey[]
): FeatureKey[] {
  return features.filter((feature) => canAccessFeature(context, feature));
}
