'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ItemTypeDefinition, ItemTypeSection } from '@/shared/config/item-types';
import { useItemTypes } from '@/features/item-types';
import {
  getColumnId,
  parseColumnId,
  resolveKanbanColumnOrder,
  sortByKanbanOrder,
} from '@/shared/lib/kanban-utils';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';

interface KanbanBoardProps<T extends { id: string; kanbanOrder?: number }> {
  section: ItemTypeSection;
  items: T[];
  getItemType: (item: T) => string | undefined;
  renderItem: (item: T) => ReactNode;
  emptyMessage: string;
  draggable?: boolean;
  columnOrder?: string[];
  onColumnReorder?: (columnKeys: string[]) => void;
  onItemMove?: (itemId: string, columnKey: string, targetIndex: number) => void;
}

type ColumnItemsMap = Record<string, string[]>;

function buildColumnItemsMap<T extends { id: string; kanbanOrder?: number }>(
  items: T[],
  columnKeys: string[],
  getItemType: (item: T) => string | undefined,
  resolveType: (section: ItemTypeSection, value?: string) => string,
  section: ItemTypeSection
): ColumnItemsMap {
  return columnKeys.reduce<ColumnItemsMap>((acc, columnKey) => {
    acc[columnKey] = sortByKanbanOrder(
      items.filter((item) => resolveType(section, getItemType(item)) === columnKey)
    ).map((item) => item.id);
    return acc;
  }, {});
}

function findColumnKey(columnItems: ColumnItemsMap, itemId: string): string | null {
  for (const [columnKey, itemIds] of Object.entries(columnItems)) {
    if (itemIds.includes(itemId)) {
      return columnKey;
    }
  }

  return null;
}

function resolveOverColumnKey(
  overId: string,
  columnItems: ColumnItemsMap,
  overData?: { columnKey?: string }
): string | null {
  return (
    parseColumnId(overId) ??
    findColumnKey(columnItems, overId) ??
    overData?.columnKey ??
    null
  );
}

function resolveItemInsertIndex(
  overId: string,
  items: string[],
  activeItemId: string
): number {
  if (parseColumnId(overId)) {
    return items.length;
  }

  const overIndex = items.indexOf(overId);
  if (overIndex >= 0) {
    return overIndex;
  }

  return items.filter((id) => id !== activeItemId).length;
}

function getColumnLabel(
  section: ItemTypeSection,
  key: string,
  customLabel: string,
  t: ReturnType<typeof useTranslations>
) {
  if (customLabel) {
    return customLabel;
  }

  if (key === 'short' || key === 'medium' || key === 'long' || key === 'backlog') {
    return t(`types.${key}` as 'types.short');
  }

  return key;
}

function StaticKanbanBoard<T extends { id: string; kanbanOrder?: number }>({
  section,
  items,
  getItemType,
  renderItem,
  emptyMessage,
  columns,
}: {
  section: ItemTypeSection;
  items: T[];
  getItemType: (item: T) => string | undefined;
  renderItem: (item: T) => ReactNode;
  emptyMessage: string;
  columns: ItemTypeDefinition[];
}) {
  const { resolveType } = useItemTypes();
  const t = useTranslations(section);

  if (items.length === 0) {
    return <p className="text-center text-muted-foreground py-12">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid gap-4 min-w-max md:min-w-0"
        style={{
          gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(240px, 1fr))`,
        }}
      >
        {columns.map((column) => {
          const columnItems = sortByKanbanOrder(
            items.filter(
              (item) => resolveType(section, getItemType(item)) === column.key
            )
          );

          return (
            <div key={column.key} className="rounded-xl border bg-card/50 p-4 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold truncate">
                  {getColumnLabel(section, column.key, column.label, t)}
                </h3>
                <span className="text-xs text-muted-foreground shrink-0">
                  {columnItems.length}
                </span>
              </div>
              <div className="space-y-2 min-h-24">
                {columnItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">
                    {t('kanbanEmptyColumn')}
                  </p>
                ) : (
                  columnItems.map((item) => renderItem(item))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SortableKanbanColumn({
  columnKey,
  label,
  count,
  itemIds,
  emptyLabel,
  renderItem,
}: {
  columnKey: string;
  label: string;
  count: number;
  itemIds: string[];
  emptyLabel: string;
  renderItem: (itemId: string) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getColumnId(columnKey),
    data: { type: 'column', columnKey },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: getColumnId(columnKey),
    data: { type: 'column', columnKey },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'min-h-full min-w-0 space-y-3 rounded-xl border border-border/60 bg-card/50 p-4 transition-colors',
        isDragging && 'border-primary opacity-60',
        isOver && 'border-primary bg-primary/5'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Reorder column"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h3 className="font-semibold truncate">{label}</h3>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{count}</span>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setDroppableRef}
          className={cn('min-h-24 space-y-2 rounded-lg', isOver && 'bg-primary/5')}
        >
          {itemIds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">{emptyLabel}</p>
          ) : (
            itemIds.map((itemId) => (
              <SortableKanbanItem key={itemId} itemId={itemId} columnKey={columnKey}>
                {renderItem(itemId)}
              </SortableKanbanItem>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableKanbanItem({
  itemId,
  columnKey,
  children,
}: {
  itemId: string;
  columnKey: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: itemId,
    data: { type: 'item', columnKey },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex gap-2 touch-none', isDragging && 'opacity-40')}
    >
      <button
        type="button"
        className="mt-3 h-7 w-5 shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Reorder item"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function DraggableKanbanBoard<T extends { id: string; kanbanOrder?: number }>({
  section,
  items,
  getItemType,
  renderItem,
  emptyMessage,
  columns,
  columnKeys,
  onColumnReorder,
  onItemMove,
}: {
  section: ItemTypeSection;
  items: T[];
  getItemType: (item: T) => string | undefined;
  renderItem: (item: T) => ReactNode;
  emptyMessage: string;
  columns: ItemTypeDefinition[];
  columnKeys: string[];
  onColumnReorder?: (columnKeys: string[]) => void;
  onItemMove?: (itemId: string, columnKey: string, targetIndex: number) => void;
}) {
  const { resolveType } = useItemTypes();
  const t = useTranslations(section);
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const [columnItems, setColumnItems] = useState<ColumnItemsMap>(() =>
    buildColumnItemsMap(items, columnKeys, getItemType, resolveType, section)
  );
  const columnItemsRef = useRef(columnItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'column' | 'item' | null>(null);

  const syncColumnItems = (next: ColumnItemsMap) => {
    columnItemsRef.current = next;
    setColumnItems(next);
  };

  useEffect(() => {
    syncColumnItems(
      buildColumnItemsMap(items, columnKeys, getItemType, resolveType, section)
    );
  }, [items, columnKeys, getItemType, resolveType, section]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const activeData = active.data.current as { type?: 'column' | 'item' } | undefined;
    setActiveId(String(active.id));
    setActiveType(activeData?.type ?? null);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) {
      return;
    }

    const activeData = active.data.current as { type?: 'column' | 'item' } | undefined;
    if (activeData?.type !== 'item') {
      return;
    }

    const activeItemId = String(active.id);
    const overId = String(over.id);
    if (activeItemId === overId) {
      return;
    }

    const current = columnItemsRef.current;
    const activeColumnKey = findColumnKey(current, activeItemId);
    if (!activeColumnKey) {
      return;
    }

    const overColumnKey = resolveOverColumnKey(
      overId,
      current,
      (over.data.current as { columnKey?: string } | undefined)
    );

    if (!overColumnKey) {
      return;
    }

    const activeItems = [...current[activeColumnKey]];
    const activeIndex = activeItems.indexOf(activeItemId);

    if (activeIndex === -1) {
      return;
    }

    let nextColumnItems = current;

    if (activeColumnKey === overColumnKey) {
      const overIndex = resolveItemInsertIndex(overId, activeItems, activeItemId);

      if (overIndex < 0 || activeIndex === overIndex) {
        return;
      }

      nextColumnItems = {
        ...current,
        [activeColumnKey]: arrayMove(activeItems, activeIndex, overIndex),
      };
    } else {
      const overItems = [...current[overColumnKey]];
      activeItems.splice(activeIndex, 1);
      const overIndex = resolveItemInsertIndex(overId, overItems, activeItemId);
      overItems.splice(overIndex, 0, activeItemId);

      nextColumnItems = {
        ...current,
        [activeColumnKey]: activeItems,
        [overColumnKey]: overItems,
      };
    }

    columnItemsRef.current = nextColumnItems;
    setColumnItems(nextColumnItems);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const activeData = active.data.current as { type?: 'column' | 'item' } | undefined;
    const currentActiveId = String(active.id);
    const overId = over ? String(over.id) : null;

    if (activeData?.type === 'column' && overId) {
      const activeColumnKey = parseColumnId(currentActiveId);
      const overColumnKey = resolveOverColumnKey(
        overId,
        columnItemsRef.current,
        (over?.data.current as { columnKey?: string } | undefined)
      );

      if (activeColumnKey && overColumnKey && activeColumnKey !== overColumnKey) {
        const oldIndex = columnKeys.indexOf(activeColumnKey);
        const newIndex = columnKeys.indexOf(overColumnKey);

        if (oldIndex >= 0 && newIndex >= 0) {
          onColumnReorder?.(arrayMove(columnKeys, oldIndex, newIndex));
        }
      }
    }

    if (activeData?.type === 'item') {
      const finalColumnKey = findColumnKey(columnItemsRef.current, currentActiveId);

      if (finalColumnKey) {
        const targetIndex =
          columnItemsRef.current[finalColumnKey]?.indexOf(currentActiveId) ?? -1;

        if (targetIndex >= 0) {
          onItemMove?.(currentActiveId, finalColumnKey, targetIndex);
        }
      }
    }

    setActiveId(null);
    setActiveType(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveType(null);
    syncColumnItems(
      buildColumnItemsMap(items, columnKeys, getItemType, resolveType, section)
    );
  };

  if (items.length === 0) {
    return <p className="text-center text-muted-foreground py-12">{emptyMessage}</p>;
  }

  const activeOverlay =
    activeType === 'item' && activeId && itemsById.has(activeId)
      ? renderItem(itemsById.get(activeId) as T)
      : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="overflow-x-auto pb-2">
        <SortableContext
          items={columnKeys.map(getColumnId)}
          strategy={horizontalListSortingStrategy}
        >
          <div
            className="grid gap-4 min-w-max md:min-w-0"
            style={{
              gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(240px, 1fr))`,
            }}
          >
            {columns.map((column) => (
              <SortableKanbanColumn
                key={column.key}
                columnKey={column.key}
                label={getColumnLabel(section, column.key, column.label, t)}
                count={columnItems[column.key]?.length ?? 0}
                itemIds={columnItems[column.key] ?? []}
                emptyLabel={t('kanbanEmptyColumn')}
                renderItem={(itemId) => renderItem(itemsById.get(itemId) as T)}
              />
            ))}
          </div>
        </SortableContext>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeOverlay ? (
          <div className="cursor-grabbing rounded-xl border border-primary opacity-95 shadow-xl">
            {activeOverlay}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function KanbanBoard<T extends { id: string; kanbanOrder?: number }>({
  section,
  items,
  getItemType,
  renderItem,
  emptyMessage,
  draggable = false,
  columnOrder = [],
  onColumnReorder,
  onItemMove,
}: KanbanBoardProps<T>) {
  const { getEnabledTypes } = useItemTypes();
  const enabledColumns = getEnabledTypes(section);
  const columns = useMemo(
    () => resolveKanbanColumnOrder(columnOrder, enabledColumns),
    [columnOrder, enabledColumns]
  );
  const columnKeys = useMemo(() => columns.map((column) => column.key), [columns]);

  if (!draggable) {
    return (
      <StaticKanbanBoard
        section={section}
        items={items}
        getItemType={getItemType}
        renderItem={renderItem}
        emptyMessage={emptyMessage}
        columns={enabledColumns}
      />
    );
  }

  return (
    <DraggableKanbanBoard
      section={section}
      items={items}
      getItemType={getItemType}
      renderItem={renderItem}
      emptyMessage={emptyMessage}
      columns={columns}
      columnKeys={columnKeys}
      onColumnReorder={onColumnReorder}
      onItemMove={onItemMove}
    />
  );
}
