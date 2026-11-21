import { isValidItemTypeKey, normalizeItemTypeKey } from '@/shared/config/item-types';

const KEY_MAX_LENGTH = 32;

export function createGoalColumnKey(label: string, existingKeys: readonly string[]): string {
  const normalized = normalizeItemTypeKey(label);
  const preferred = normalized && isValidItemTypeKey(normalized) ? normalized : '';
  const base = (preferred || `column-${randomSuffix()}`).slice(0, KEY_MAX_LENGTH);
  const taken = new Set(existingKeys);

  if (!taken.has(base) && isValidItemTypeKey(base)) {
    return base;
  }

  for (let index = 2; index < 1000; index += 1) {
    const suffix = `-${index}`;
    const key = `${base.slice(0, KEY_MAX_LENGTH - suffix.length)}${suffix}`;
    if (!taken.has(key) && isValidItemTypeKey(key)) {
      return key;
    }
  }

  return `column-${randomSuffix()}`;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}
