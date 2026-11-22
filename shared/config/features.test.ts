import { describe, expect, it } from 'vitest';
import { resolveFeatureEnabled } from '@/shared/config/features';
import { canAccess } from '@/shared/lib/access/can-access';
import type { AccessContext } from '@/shared/lib/access/types';

const user: AccessContext = {
  role: 'USER',
  hasActiveSubscription: false,
  grantedFeatures: [],
  globalFeatureFlags: { ascent: false } as AccessContext['globalFeatureFlags'],
};

describe('ascent feature flag', () => {
  it('stays disabled in production until the stored flag is on', () => {
    expect(resolveFeatureEnabled('ascent', false, 'production')).toBe(false);
    expect(resolveFeatureEnabled('ascent', true, 'production')).toBe(true);
    expect(resolveFeatureEnabled('habits', false, 'development')).toBe(false);
    expect(canAccess(user, 'ascent', 'production').allowed).toBe(false);
  });

  it('opens ascent during local development without changing the stored flag', () => {
    expect(resolveFeatureEnabled('ascent', false, 'development')).toBe(true);
    expect(canAccess(user, 'ascent', 'development').allowed).toBe(true);
    expect(canAccess({ ...user, role: 'GUEST' }, 'ascent', 'development')).toMatchObject({
      allowed: false,
      reason: 'auth_required',
    });
  });
});
