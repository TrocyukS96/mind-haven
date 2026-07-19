export const ITEM_TYPE_SECTIONS = ['tasks', 'goals'] as const;
export type ItemTypeSection = (typeof ITEM_TYPE_SECTIONS)[number];

export const SYSTEM_ITEM_TYPE_KEYS = ['backlog', 'short', 'medium', 'long'] as const;
export type SystemItemTypeKey = (typeof SYSTEM_ITEM_TYPE_KEYS)[number];

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

export function getEnabledItemTypes(
  catalog: ItemTypeCatalog,
  section: ItemTypeSection
): ItemTypeDefinition[] {
  return catalog[section]
    .filter((type) => type.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getDefaultItemTypeKey(section: ItemTypeSection): string {
  const enabled = getEnabledItemTypes(getDefaultItemTypes(), section);
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
  const fallback = getDefaultItemTypeKey(section);

  if (!value) {
    return fallback;
  }

  if (enabled.some((type) => type.key === value)) {
    return value;
  }

  return fallback;
}
