import type { ItemTypeDefinition } from '@/shared/config/item-types';

export function resolveKanbanColumnOrder(
  storedOrder: string[],
  enabledColumns: ItemTypeDefinition[]
): ItemTypeDefinition[] {
  const columnsByKey = new Map(enabledColumns.map((column) => [column.key, column]));
  const enabledKeys = new Set(enabledColumns.map((column) => column.key));

  const orderedKeys = storedOrder.filter((key) => enabledKeys.has(key));
  const missingKeys = enabledColumns
    .filter((column) => !orderedKeys.includes(column.key))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((column) => column.key);

  return [...orderedKeys, ...missingKeys].flatMap((key) => {
    const column = columnsByKey.get(key);
    return column ? [column] : [];
  });
}

export function sortByKanbanOrder<T extends { id: string; kanbanOrder?: number }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const orderA = a.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.kanbanOrder ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.id.localeCompare(b.id);
  });
}

export function getColumnId(columnKey: string): string {
  return `column:${columnKey}`;
}

export function parseColumnId(id: string): string | null {
  return id.startsWith('column:') ? id.slice('column:'.length) : null;
}
