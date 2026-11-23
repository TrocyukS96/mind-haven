import { arrayMove } from '@dnd-kit/sortable';
import { parseColumnId } from '@/shared/lib/kanban-utils';

export type ColumnItemsMap = Record<string, string[]>;

const DROP_PREFIX = 'drop:';

export function columnDropId(columnId: string): string {
  return `${DROP_PREFIX}${columnId}`;
}

export function parseColumnDropId(id: string): string | null {
  return id.startsWith(DROP_PREFIX) ? id.slice(DROP_PREFIX.length) : null;
}

export function findColumnId(columnItems: ColumnItemsMap, itemId: string): string | null {
  for (const [columnId, itemIds] of Object.entries(columnItems)) {
    if (itemIds.includes(itemId)) return columnId;
  }
  return null;
}

export function resolveOverColumnId(
  overId: string,
  columnItems: ColumnItemsMap,
  overData?: { columnKey?: string }
): string | null {
  return (
    parseColumnId(overId) ??
    parseColumnDropId(overId) ??
    findColumnId(columnItems, overId) ??
    overData?.columnKey ??
    null
  );
}

export function resolveItemInsertIndex(overId: string, items: string[], activeItemId: string): number {
  if (parseColumnId(overId) || parseColumnDropId(overId)) return items.length;
  const overIndex = items.indexOf(overId);
  if (overIndex >= 0) return overIndex;
  return items.filter((id) => id !== activeItemId).length;
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function placeTaskInColumns(
  columnItems: ColumnItemsMap,
  activeItemId: string,
  overId: string,
  overData?: { columnKey?: string }
): ColumnItemsMap | null {
  if (activeItemId === overId) return null;

  const activeColumnId = findColumnId(columnItems, activeItemId);
  if (!activeColumnId) return null;

  const overColumnId = resolveOverColumnId(overId, columnItems, overData);
  if (!overColumnId || !columnItems[overColumnId]) return null;

  const activeItems = [...columnItems[activeColumnId]];
  const activeIndex = activeItems.indexOf(activeItemId);
  if (activeIndex < 0) return null;

  if (activeColumnId === overColumnId) {
    const overIndex = resolveItemInsertIndex(overId, activeItems, activeItemId);
    if (overIndex < 0 || activeIndex === overIndex) return null;
    const nextItems = arrayMove(activeItems, activeIndex, overIndex);
    if (sameIds(nextItems, columnItems[activeColumnId])) return null;
    return { ...columnItems, [activeColumnId]: nextItems };
  }

  const overItems = [...columnItems[overColumnId]];
  activeItems.splice(activeIndex, 1);
  overItems.splice(resolveItemInsertIndex(overId, overItems, activeItemId), 0, activeItemId);
  return {
    ...columnItems,
    [activeColumnId]: activeItems,
    [overColumnId]: overItems,
  };
}
