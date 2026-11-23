import { arrayMove } from '@dnd-kit/sortable';

export type LaneItems = Record<string, string[]>;

export function laneDropId(lane: string): string {
  return `col:${lane}`;
}

export function parseLaneId(id: string): string | null {
  return id.startsWith('col:') ? id.slice(4) : null;
}

export function findLane(lanes: LaneItems, itemId: string): string | null {
  for (const [lane, ids] of Object.entries(lanes)) {
    if (ids.includes(itemId)) return lane;
  }
  return null;
}

export function resolveLane(
  overId: string,
  lanes: LaneItems,
  overData?: { columnKey?: string }
): string | null {
  return parseLaneId(overId) ?? findLane(lanes, overId) ?? overData?.columnKey ?? null;
}

export function insertIndex(overId: string, items: string[], activeId: string): number {
  if (parseLaneId(overId)) return items.length;
  const overIndex = items.indexOf(overId);
  if (overIndex >= 0) return overIndex;
  return items.filter((id) => id !== activeId).length;
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function placeCardInLanes(
  lanes: LaneItems,
  activeId: string,
  overId: string,
  overData?: { columnKey?: string }
): LaneItems | null {
  if (activeId === overId) return null;

  const activeLane = findLane(lanes, activeId);
  if (!activeLane) return null;
  const overLane = resolveLane(overId, lanes, overData);
  if (!overLane || !lanes[overLane]) return null;

  const activeItems = [...lanes[activeLane]];
  const activeIndex = activeItems.indexOf(activeId);
  if (activeIndex < 0) return null;

  if (activeLane === overLane) {
    const overIndex = insertIndex(overId, activeItems, activeId);
    if (overIndex < 0 || activeIndex === overIndex) return null;
    const nextItems = arrayMove(activeItems, activeIndex, overIndex);
    if (sameIds(nextItems, lanes[activeLane])) return null;
    return { ...lanes, [activeLane]: nextItems };
  }

  const overItems = [...lanes[overLane]];
  activeItems.splice(activeIndex, 1);
  overItems.splice(insertIndex(overId, overItems, activeId), 0, activeId);
  return { ...lanes, [activeLane]: activeItems, [overLane]: overItems };
}
