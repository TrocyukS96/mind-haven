import {
  getDefaultItemTypes,
  ITEM_TYPE_SECTIONS,
  type ItemTypeCatalog,
  type ItemTypeDefinition,
  type ItemTypeSection,
} from '@/shared/config/item-types';
import { prisma } from '@/shared/lib/db';

function isItemTypeSection(value: string): value is ItemTypeSection {
  return ITEM_TYPE_SECTIONS.includes(value as ItemTypeSection);
}

function normalizeCatalog(rows: ItemTypeDefinition[]): ItemTypeCatalog {
  const defaults = getDefaultItemTypes();
  const result = structuredClone(defaults);

  for (const row of rows) {
    const sectionTypes = result[row.section];
    const existingIndex = sectionTypes.findIndex((type) => type.key === row.key);

    if (existingIndex >= 0) {
      sectionTypes[existingIndex] = row;
    } else {
      sectionTypes.push(row);
    }
  }

  for (const section of ITEM_TYPE_SECTIONS) {
    result[section].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return result;
}

export async function ensureItemTypesSeeded(): Promise<void> {
  const existing = await prisma.itemType.findMany({
    select: { section: true, key: true },
  });

    const existingKeys = new Set(
      existing.map((item: { section: string; key: string }) => `${item.section}:${item.key}`)
    );
  const defaults = getDefaultItemTypes();
  const missing: Array<{
    section: ItemTypeSection;
    key: string;
    label: string;
    enabled: boolean;
    sortOrder: number;
    isSystem: boolean;
  }> = [];

  for (const section of ITEM_TYPE_SECTIONS) {
    for (const type of defaults[section]) {
      const compositeKey = `${section}:${type.key}`;
      if (!existingKeys.has(compositeKey)) {
        missing.push({
          section: type.section,
          key: type.key,
          label: type.label,
          enabled: type.enabled,
          sortOrder: type.sortOrder,
          isSystem: type.isSystem,
        });
      }
    }
  }

  if (missing.length > 0) {
    await prisma.itemType.createMany({
      data: missing,
      skipDuplicates: true,
    });
  }

  await syncSystemTypeSortOrders(defaults);
}

async function syncSystemTypeSortOrders(defaults: ItemTypeCatalog): Promise<void> {
  const updates: Promise<unknown>[] = [];

  for (const section of ITEM_TYPE_SECTIONS) {
    for (const type of defaults[section]) {
      if (!type.isSystem) {
        continue;
      }

      updates.push(
        prisma.itemType.updateMany({
          where: { section, key: type.key, isSystem: true },
          data: { sortOrder: type.sortOrder },
        })
      );
    }
  }

  await Promise.all(updates);
}

export async function getItemTypes(): Promise<ItemTypeCatalog> {
  const defaults = getDefaultItemTypes();

  try {
    await ensureItemTypesSeeded();

    const rows = await prisma.itemType.findMany({
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
    });

    const mapped: ItemTypeDefinition[] = rows
      .filter((row: { section: string }) => isItemTypeSection(row.section))
      .map((row: {
        key: string;
        section: string;
        label: string;
        enabled: boolean;
        sortOrder: number;
        isSystem: boolean;
      }) => ({
        key: row.key,
        section: row.section as ItemTypeSection,
        label: row.label,
        enabled: row.enabled,
        sortOrder: row.sortOrder,
        isSystem: row.isSystem,
      }));

    return mapped.length > 0 ? normalizeCatalog(mapped) : defaults;
  } catch {
    return defaults;
  }
}

export async function upsertItemType(
  definition: Omit<ItemTypeDefinition, 'isSystem'> & { isSystem?: boolean },
  updatedBy?: string
): Promise<void> {
  await prisma.itemType.upsert({
    where: {
      section_key: {
        section: definition.section,
        key: definition.key,
      },
    },
    create: {
      section: definition.section,
      key: definition.key,
      label: definition.label,
      enabled: definition.enabled,
      sortOrder: definition.sortOrder,
      isSystem: definition.isSystem ?? false,
      updatedBy,
    },
    update: {
      label: definition.label,
      enabled: definition.enabled,
      sortOrder: definition.sortOrder,
      updatedBy,
    },
  });
}

export async function addItemType(
  section: ItemTypeSection,
  key: string,
  label: string,
  updatedBy?: string
): Promise<ItemTypeCatalog> {
  const catalog = await getItemTypes();
  const sectionTypes = catalog[section];
  const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '-');

  if (!normalizedKey) {
    throw new Error('Invalid type key');
  }

  if (sectionTypes.some((type) => type.key === normalizedKey)) {
    throw new Error('Type already exists');
  }

  const nextSortOrder =
    sectionTypes.reduce((max, type) => Math.max(max, type.sortOrder), -1) + 1;

  await upsertItemType(
    {
      section,
      key: normalizedKey,
      label: label.trim(),
      enabled: true,
      sortOrder: nextSortOrder,
      isSystem: false,
    },
    updatedBy
  );

  return getItemTypes();
}

export async function updateItemTypeSettings(
  section: ItemTypeSection,
  key: string,
  updates: Partial<Pick<ItemTypeDefinition, 'label' | 'enabled' | 'sortOrder'>>,
  updatedBy?: string
): Promise<ItemTypeCatalog> {
  const catalog = await getItemTypes();
  const current = catalog[section].find((type) => type.key === key);

  if (!current) {
    throw new Error('Type not found');
  }

  await upsertItemType(
    {
      section,
      key,
      label: updates.label ?? current.label,
      enabled: updates.enabled ?? current.enabled,
      sortOrder: updates.sortOrder ?? current.sortOrder,
      isSystem: current.isSystem,
    },
    updatedBy
  );

  return getItemTypes();
}
