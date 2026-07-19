import {
  FEATURE_KEYS,
  FEATURES,
  getDefaultFeatureFlags,
  type FeatureKey,
} from '@/shared/config/features';
import { prisma } from '@/shared/lib/db';

function isFeatureKey(value: string): value is FeatureKey {
  return FEATURE_KEYS.includes(value as FeatureKey);
}

export async function ensureFeatureFlagsSeeded(): Promise<void> {
  const existing = await prisma.featureFlag.findMany({
    select: { key: true },
  });

  const existingKeys = new Set(existing.map((item) => item.key));
  const missing = FEATURE_KEYS.filter((key) => !existingKeys.has(key));

  if (missing.length === 0) {
    return;
  }

  await prisma.featureFlag.createMany({
    data: missing.map((key) => ({
      key,
      enabled: FEATURES[key].defaultEnabled,
    })),
    skipDuplicates: true,
  });
}

export async function getFeatureFlags(): Promise<Record<FeatureKey, boolean>> {
  const defaults = getDefaultFeatureFlags();

  try {
    await ensureFeatureFlagsSeeded();

    const flags = await prisma.featureFlag.findMany();
    const result = { ...defaults };

    for (const flag of flags) {
      if (isFeatureKey(flag.key)) {
        result[flag.key] = flag.enabled;
      }
    }

    return result;
  } catch {
    return defaults;
  }
}

export async function updateFeatureFlag(
  key: FeatureKey,
  enabled: boolean,
  updatedBy?: string
): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    create: { key, enabled, updatedBy },
    update: { enabled, updatedBy },
  });
}

export async function updateFeatureFlags(
  updates: Partial<Record<FeatureKey, boolean>>,
  updatedBy?: string
): Promise<Record<FeatureKey, boolean>> {
  await Promise.all(
    Object.entries(updates).map(([key, enabled]) => {
      if (!isFeatureKey(key) || enabled === undefined) {
        return Promise.resolve();
      }

      return updateFeatureFlag(key, enabled, updatedBy);
    })
  );

  return getFeatureFlags();
}
