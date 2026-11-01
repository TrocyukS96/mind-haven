export const ITEM_TYPE_SECTIONS = ['tasks', 'goals'] as const;
export type ItemTypeSection = (typeof ITEM_TYPE_SECTIONS)[number];

export const SYSTEM_ITEM_TYPE_KEYS = ['backlog', 'short', 'medium', 'long'] as const;
export type SystemItemTypeKey = (typeof SYSTEM_ITEM_TYPE_KEYS)[number];

export const ITEM_TYPE_LABEL_MAX_LENGTH = 40;
const ITEM_TYPE_KEY_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

export interface ItemTypeDefinition {
  key: string;
  section: ItemTypeSection;
  label: string;
  enabled: boolean;
  sortOrder: number;
  isSystem: boolean;
}

export type ItemTypeCatalog = Record<ItemTypeSection, ItemTypeDefinition[]>;

const SYSTEM_TYPE_ORDER: Record<ItemTypeSection, SystemItemTypeKey[]> = {
  tasks: ['backlog', 'short', 'medium', 'long'],
  goals: ['backlog', 'short', 'medium', 'long'],
};

export function getDefaultItemTypes(): ItemTypeCatalog {
  return ITEM_TYPE_SECTIONS.reduce((acc, section) => {
    acc[section] = SYSTEM_TYPE_ORDER[section].map((key, index) => ({
      key,
      section,
      label: '',
      enabled: true,
      sortOrder: index,
      isSystem: true,
    }));
    return acc;
  }, {} as ItemTypeCatalog);
}

export function buildItemTypeCatalog(rows: ItemTypeDefinition[]): ItemTypeCatalog {
  const defaults = getDefaultItemTypes();
  const result = ITEM_TYPE_SECTIONS.reduce((acc, section) => {
    acc[section] = [];
    return acc;
  }, {} as ItemTypeCatalog);

  for (const row of rows) {
    if (!ITEM_TYPE_SECTIONS.includes(row.section)) {
      continue;
    }

    const sectionTypes = result[row.section];
    const existingIndex = sectionTypes.findIndex((type) => type.key === row.key);

    if (existingIndex >= 0) {
      sectionTypes[existingIndex] = row;
    } else {
      sectionTypes.push(row);
    }
  }

  for (const section of ITEM_TYPE_SECTIONS) {
    if (result[section].length === 0) {
      result[section] = defaults[section];
    } else {
      result[section].sort((a, b) => a.sortOrder - b.sortOrder);
    }
  }

  return result;
}

export function getEnabledItemTypes(
  catalog: ItemTypeCatalog,
  section: ItemTypeSection
): ItemTypeDefinition[] {
  return catalog[section]
    .filter((type) => type.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isSystemItemTypeKey(key: string): key is SystemItemTypeKey {
  return (SYSTEM_ITEM_TYPE_KEYS as readonly string[]).includes(key);
}

export function getItemTypeOptionLabel(
  type: ItemTypeDefinition,
  translateSystem: (key: SystemItemTypeKey) => string
): string {
  if (type.label) {
    return type.label;
  }

  if (isSystemItemTypeKey(type.key)) {
    return translateSystem(type.key);
  }

  return type.key;
}

export function normalizeItemTypeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isValidItemTypeKey(key: string): boolean {
  return ITEM_TYPE_KEY_PATTERN.test(key);
}

export function getDefaultItemTypeKey(
  section: ItemTypeSection,
  catalog: ItemTypeCatalog = getDefaultItemTypes()
): string {
  const enabled = getEnabledItemTypes(catalog, section);
  return enabled.find((type) => type.key === 'backlog')?.key ?? enabled[0]?.key ?? 'backlog';
}

export function toItemTypeKey(section: ItemTypeSection, key: string): string {
  return `${section}:${key}`;
}

export function parseItemTypeKey(value: string): { section: ItemTypeSection; key: string } | null {
  const [section, ...rest] = value.split(':');
  const key = rest.join(':');

  if (!section || !key || !ITEM_TYPE_SECTIONS.includes(section as ItemTypeSection)) {
    return null;
  }

  return { section: section as ItemTypeSection, key };
}

export function resolveItemType(
  value: string | undefined,
  section: ItemTypeSection,
  catalog: ItemTypeCatalog
): string {
  const enabled = getEnabledItemTypes(catalog, section);
  const fallback = getDefaultItemTypeKey(section, catalog);

  if (!value) {
    return fallback;
  }

  if (enabled.some((type) => type.key === value)) {
    return value;
  }

  return fallback;
}
