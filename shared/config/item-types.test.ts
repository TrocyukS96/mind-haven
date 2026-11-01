import { describe, expect, it } from 'vitest';
import {
  buildItemTypeCatalog,
  getDefaultItemTypeKey,
  getDefaultItemTypes,
  isValidItemTypeKey,
  normalizeItemTypeKey,
  resolveItemType,
  type ItemTypeCatalog,
} from './item-types';

function catalogWith(goalsEnabled: Record<string, boolean>): ItemTypeCatalog {
  const defaults = getDefaultItemTypes();

  return {
    ...defaults,
    goals: defaults.goals.map((type) => ({
      ...type,
      enabled: goalsEnabled[type.key] ?? type.enabled,
    })),
  };
}

describe('item type keys', () => {
  it('normalizes a display key into a stable column id', () => {
    expect(normalizeItemTypeKey('  Sprint Plan ')).toBe('sprint-plan');
    expect(isValidItemTypeKey(normalizeItemTypeKey('Sprint Plan'))).toBe(true);
  });

  it('rejects keys that cannot be stored safely', () => {
    expect(isValidItemTypeKey('123')).toBe(false);
    expect(isValidItemTypeKey('')).toBe(false);
    expect(isValidItemTypeKey(normalizeItemTypeKey('!!!'))).toBe(false);
  });
});

describe('buildItemTypeCatalog', () => {
  it('keeps starter columns only until the saved list replaces them', () => {
    const defaults = getDefaultItemTypes();
    const withoutBacklog = defaults.goals.filter((type) => type.key !== 'backlog');

    expect(buildItemTypeCatalog(withoutBacklog).goals.map((type) => type.key)).toEqual([
      'short',
      'medium',
      'long',
    ]);
    expect(buildItemTypeCatalog([]).goals.map((type) => type.key)).toEqual([
      'backlog',
      'short',
      'medium',
      'long',
    ]);
  });
});

describe('resolveItemType', () => {
  it('keeps an enabled column and falls back when a column is hidden', () => {
    const catalog = catalogWith({ short: false });

    expect(resolveItemType('short', 'goals', catalog)).toBe('backlog');
    expect(resolveItemType('medium', 'goals', catalog)).toBe('medium');
  });

  it('does not fall back to a hidden backlog column', () => {
    const catalog = catalogWith({ backlog: false });

    expect(getDefaultItemTypeKey('goals', catalog)).toBe('short');
    expect(resolveItemType('missing', 'goals', catalog)).toBe('short');
  });
});
