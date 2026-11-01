import {
  buildItemTypeCatalog,
  getDefaultItemTypeKey,
  getDefaultItemTypes,
  isValidItemTypeKey,
  ITEM_TYPE_LABEL_MAX_LENGTH,
  ITEM_TYPE_SECTIONS,
  normalizeItemTypeKey,
  type ItemTypeCatalog,
  type ItemTypeDefinition,
  type ItemTypeSection,
} from '@/shared/config/item-types';
import { prisma } from '@/shared/lib/db';

export const ITEM_TYPE_ERROR_CODES = [
  'invalid_key',
  'invalid_label',
  'exists',
  'not_found',
  'system',
  'last_enabled',
] as const;

export type ItemTypeErrorCode = (typeof ITEM_TYPE_ERROR_CODES)[number];

export class ItemTypeError extends Error {
  code: ItemTypeErrorCode;

  constructor(code: ItemTypeErrorCode) {
    super(code);
    this.code = code;
  }
}

function isItemTypeSection(value: string): value is ItemTypeSection {
  return ITEM_TYPE_SECTIONS.includes(value as ItemTypeSection);
}

export async function ensureItemTypesSeeded(): Promise<void> {
  const existing = await prisma.itemType.findMany({
    select: { section: true },
  });

  const sectionsWithColumns = new Set(existing.map((item: { section: string }) => item.section));
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
    if (sectionsWithColumns.has(section)) {
      continue;
    }

    for (const type of defaults[section]) {
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

  if (missing.length > 0) {
    await prisma.itemType.createMany({
      data: missing,
      skipDuplicates: true,
    });
  }

  await prisma.itemType.updateMany({
    where: { isSystem: true, enabled: false },
    data: { enabled: true },
  });

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

    return mapped.length > 0 ? buildItemTypeCatalog(mapped) : defaults;
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

function normalizeItemTypeLabel(label: string, allowEmpty: boolean): string {
  const normalized = label.trim();

  if (!normalized && !allowEmpty) {
    throw new ItemTypeError('invalid_label');
  }

  if (normalized.length > ITEM_TYPE_LABEL_MAX_LENGTH) {
    throw new ItemTypeError('invalid_label');
  }

  return normalized;
}

export async function addItemType(
  section: ItemTypeSection,
  key: string,
  label: string,
  updatedBy?: string
): Promise<ItemTypeCatalog> {
  const catalog = await getItemTypes();
  const sectionTypes = catalog[section];
  const normalizedKey = normalizeItemTypeKey(key);
  const normalizedLabel = normalizeItemTypeLabel(label, false);

  if (!isValidItemTypeKey(normalizedKey)) {
    throw new ItemTypeError('invalid_key');
  }

  if (sectionTypes.some((type) => type.key === normalizedKey)) {
    throw new ItemTypeError('exists');
  }

  const nextSortOrder =
    sectionTypes.reduce((max, type) => Math.max(max, type.sortOrder), -1) + 1;

  await upsertItemType(
    {
      section,
      key: normalizedKey,
      label: normalizedLabel,
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
    throw new ItemTypeError('not_found');
  }

  const nextEnabled = current.isSystem ? true : (updates.enabled ?? current.enabled);

  if (!nextEnabled) {
    const otherEnabled = catalog[section].filter((type) => type.enabled && type.key !== key);
    if (otherEnabled.length === 0) {
      throw new ItemTypeError('last_enabled');
    }
  }

  const nextLabel =
    updates.label === undefined
      ? current.label
      : normalizeItemTypeLabel(updates.label, current.isSystem);

  if (!current.isSystem && !nextLabel) {
    throw new ItemTypeError('invalid_label');
  }

  await upsertItemType(
    {
      section,
      key,
      label: nextLabel,
      enabled: nextEnabled,
      sortOrder: updates.sortOrder ?? current.sortOrder,
      isSystem: current.isSystem,
    },
    updatedBy
  );

  return getItemTypes();
}

export async function deleteItemType(
  section: ItemTypeSection,
  key: string
): Promise<{ types: ItemTypeCatalog; fallbackKey: string }> {
  const catalog = await getItemTypes();
  const current = catalog[section].find((type) => type.key === key);

  if (!current) {
    throw new ItemTypeError('not_found');
  }

  const remaining = catalog[section].filter((type) => type.key !== key);
  const enabledRemaining = remaining.filter((type) => type.enabled);

  if (current.enabled && enabledRemaining.length === 0) {
    throw new ItemTypeError('last_enabled');
  }

  const fallbackKey = getDefaultItemTypeKey(section, {
    ...catalog,
    [section]: remaining,
  });

  const reassign =
    section === 'goals'
      ? prisma.goal.updateMany({
          where: { type: key },
          data: { type: fallbackKey },
        })
      : prisma.task.updateMany({
          where: { type: key },
          data: { type: fallbackKey },
        });

  await prisma.$transaction([
    reassign,
    prisma.itemType.delete({
      where: {
        section_key: {
          section,
          key,
        },
      },
    }),
  ]);

  return {
    types: await getItemTypes(),
    fallbackKey,
  };
}
