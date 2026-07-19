import { hasMinRole } from '@/entities/user';
import {
  FEATURE_KEYS,
  type FeatureKey,
} from '@/shared/config/features';
import { auth } from '@/shared/lib/auth/auth';
import { updateFeatureFlags } from '@/shared/lib/features/feature-service';
import { NextResponse } from 'next/server';

function isFeatureKey(value: string): value is FeatureKey {
  return FEATURE_KEYS.includes(value as FeatureKey);
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !hasMinRole(session.user.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    flags?: Partial<Record<string, boolean>>;
  };

  if (!body.flags) {
    return NextResponse.json({ error: 'Missing flags' }, { status: 400 });
  }

  const updates: Partial<Record<FeatureKey, boolean>> = {};

  for (const [key, enabled] of Object.entries(body.flags)) {
    if (isFeatureKey(key) && typeof enabled === 'boolean') {
      updates[key] = enabled;
    }
  }

  const flags = await updateFeatureFlags(updates, session.user.id);

  return NextResponse.json({ flags });
}
