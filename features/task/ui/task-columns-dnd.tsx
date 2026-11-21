'use client';

import { TaskCard } from '@/entities/task/ui/TaskCard';
import type { Task } from '@/entities/task/model/types';
import type { TaskColumn } from '@/entities/task-column/model/types';
import { TaskColumnMenu } from '@/features/task/ui/task-column-menu';
import {
  getColumnId,
  parseColumnId,
  sortByKanbanOrder,
} from '@/shared/lib/kanban-utils';
import { resolveTaskColumnId } from '@/shared/lib/planner/week-column-range';
import { KanbanItemSortableProvider } from '@/shared/ui/kanban-item-sortable';
import { cn } from '@/shared/lib/utils';
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
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type ColumnItemsMap = Record<string, string[]>;

function buildColumnItems(
  tasks: Task[],
  columns: TaskColumn[],
  resolveColumns: TaskColumn[]
): ColumnItemsMap {
  return columns.reduce<ColumnItemsMap>((map, column) => {
    map[column.id] = sortByKanbanOrder(
      tasks.filter((task) => resolveTaskColumnId(task, resolveColumns) === column.id)
    ).map((task) => task.id);
    return map;
  }, {});
}

function findColumnId(columnItems: ColumnItemsMap, itemId: string): string | null {
  for (const [columnId, itemIds] of Object.entries(columnItems)) {
    if (itemIds.includes(itemId)) return columnId;
  }
  return null;
}

function resolveOverColumnId(
  overId: string,
  columnItems: ColumnItemsMap,
  overData?: { columnKey?: string }
): string | null {
  return parseColumnId(overId) ?? findColumnId(columnItems, overId) ?? overData?.columnKey ?? null;
}

function resolveItemInsertIndex(overId: string, items: string[], activeItemId: string): number {
  if (parseColumnId(overId)) return items.length;
  const overIndex = items.indexOf(overId);
  if (overIndex >= 0) return overIndex;
  return items.filter((id) => id !== activeItemId).length;
}

function columnStats(tasks: Task[], columnId: string, resolveColumns: TaskColumn[]) {
  const inColumn = tasks.filter((task) => resolveTaskColumnId(task, resolveColumns) === columnId);
  return {
    total: inColumn.length,
    completed: inColumn.filter((task) => task.completed).length,
    minutes: inColumn.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0),
  };
}

interface TaskColumnsDndBoardProps {
  columns: TaskColumn[];
  resolveColumns: TaskColumn[];
  tasks: Task[];
  onMoveTask: (taskId: string, columnId: string, targetIndex: number, visibleOrder: string[]) => void;
  onReorderColumns: (columnIds: string[]) => void;
}

export function TaskColumnsDndBoard({
  columns,
  resolveColumns,
  tasks,
  onMoveTask,
  onReorderColumns,
}: TaskColumnsDndBoardProps) {
  const columnIds = useMemo(() => columns.map((column) => column.id), [columns]);
  const itemsById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const externalItems = useMemo(
    () => buildColumnItems(tasks, columns, resolveColumns),
    [tasks, columns, resolveColumns]
  );
  const [dragItems, setDragItems] = useState<ColumnItemsMap | null>(null);
  const columnItems = dragItems ?? externalItems;
  const columnItemsRef = useRef(columnItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'column' | 'item' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    columnItemsRef.current = columnItems;
    const activeData = active.data.current as { type?: 'column' | 'item' } | undefined;
    setActiveId(String(active.id));
    setActiveType(activeData?.type ?? null);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeData = active.data.current as { type?: 'column' | 'item' } | undefined;
    if (activeData?.type !== 'item') return;

    const activeItemId = String(active.id);
    const overId = String(over.id);
    if (activeItemId === overId) return;

    const current = columnItemsRef.current;
    const activeColumnId = findColumnId(current, activeItemId);
    if (!activeColumnId) return;
    const overColumnId = resolveOverColumnId(
      overId,
      current,
      over.data.current as { columnKey?: string } | undefined
    );
    if (!overColumnId || !current[overColumnId]) return;

    const activeItems = [...current[activeColumnId]];
    const activeIndex = activeItems.indexOf(activeItemId);
    if (activeIndex < 0) return;

    let next = current;
    if (activeColumnId === overColumnId) {
      const overIndex = resolveItemInsertIndex(overId, activeItems, activeItemId);
      if (overIndex < 0 || activeIndex === overIndex) return;
      next = { ...current, [activeColumnId]: arrayMove(activeItems, activeIndex, overIndex) };
    } else {
      const overItems = [...current[overColumnId]];
      activeItems.splice(activeIndex, 1);
      overItems.splice(resolveItemInsertIndex(overId, overItems, activeItemId), 0, activeItemId);
      next = { ...current, [activeColumnId]: activeItems, [overColumnId]: overItems };
    }

    columnItemsRef.current = next;
    setDragItems(next);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const activeData = active.data.current as { type?: 'column' | 'item' } | undefined;
    const currentActiveId = String(active.id);
    const overId = over ? String(over.id) : null;

    if (activeData?.type === 'column' && overId) {
      const activeColumnId = parseColumnId(currentActiveId);
      const overColumnId = resolveOverColumnId(
        overId,
        columnItemsRef.current,
        over?.data.current as { columnKey?: string } | undefined
      );
      if (activeColumnId && overColumnId && activeColumnId !== overColumnId) {
        const oldIndex = columnIds.indexOf(activeColumnId);
        const newIndex = columnIds.indexOf(overColumnId);
        if (oldIndex >= 0 && newIndex >= 0) {
          onReorderColumns(arrayMove(columnIds, oldIndex, newIndex));
        }
      }
    }

    if (activeData?.type === 'item') {
      const finalColumnId = findColumnId(columnItemsRef.current, currentActiveId);
      const targetIndex = finalColumnId
        ? (columnItemsRef.current[finalColumnId]?.indexOf(currentActiveId) ?? -1)
        : -1;
      if (finalColumnId && targetIndex >= 0) {
        onMoveTask(
          currentActiveId,
          finalColumnId,
          targetIndex,
          columnItemsRef.current[finalColumnId] ?? []
        );
      }
    }

    setDragItems(null);
    setActiveId(null);
    setActiveType(null);
  };

  const handleDragCancel = () => {
    columnItemsRef.current = externalItems;
    setDragItems(null);
    setActiveId(null);
    setActiveType(null);
  };

  const activeTask =
    activeType === 'item' && activeId ? itemsById.get(activeId) : undefined;
  const activeColumn =
    activeType === 'column' && activeId
      ? columns.find((column) => getColumnId(column.id) === activeId)
      : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="overflow-x-auto overscroll-x-contain pb-2">
        <SortableContext items={columnIds.map(getColumnId)} strategy={horizontalListSortingStrategy}>
          <div className="flex w-max min-w-full gap-3 sm:gap-4">
            {columns.map((column) => (
              <TaskSortableColumn
                key={column.id}
                column={column}
                itemIds={(columnItems[column.id] ?? []).filter((id) => itemsById.has(id))}
                stats={columnStats(tasks, column.id, resolveColumns)}
                renderTask={(taskId) => {
                  const task = itemsById.get(taskId);
                  if (!task) return null;
                  return (
                    <TaskCard task={task} showGoalTitle showProjectTitle showType={false} />
                  );
                }}
              />
            ))}
          </div>
        </SortableContext>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-72 cursor-grabbing opacity-95 shadow-xl">
            <TaskCard task={activeTask} showGoalTitle showProjectTitle showType={false} />
          </div>
        ) : activeColumn ? (
          <div className="w-72 rounded-xl border border-primary bg-card px-4 py-3 text-sm font-semibold shadow-xl">
            {activeColumn.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function TaskSortableColumn({
  column,
  itemIds,
  stats,
  renderTask,
}: {
  column: TaskColumn;
  itemIds: string[];
  stats: { total: number; completed: number; minutes: number };
  renderTask: (taskId: string) => ReactNode;
}) {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getColumnId(column.id),
    data: { type: 'column', columnKey: column.id },
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: getColumnId(column.id),
    data: { type: 'column', columnKey: column.id },
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
        'flex w-72 shrink-0 flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-3 sm:w-80 sm:p-4',
        column.kind === 'week' && 'border-primary/40',
        isDragging && 'border-primary opacity-60',
        isOver && 'border-primary bg-primary/5'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={tCommon('reorderColumn')}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{column.title}</h3>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {stats.completed}/{stats.total}
            </span>
          </div>
          {stats.minutes > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('columns.loadMinutes', { minutes: stats.minutes })}
            </p>
          ) : null}
        </div>
        <TaskColumnMenu column={column} />
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setDroppableRef}
          className={cn('min-h-24 flex-1 space-y-2 rounded-lg', isOver && 'bg-primary/5')}
        >
          {itemIds.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('kanbanEmptyColumn')}</p>
          ) : (
            itemIds.map((itemId) => (
              <SortableTaskCard key={itemId} taskId={itemId} columnId={column.id}>
                {renderTask(itemId)}
              </SortableTaskCard>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard({
  taskId,
  columnId,
  children,
}: {
  taskId: string;
  columnId: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: taskId,
    data: { type: 'item', columnKey: columnId },
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <KanbanItemSortableProvider value={{ attributes, listeners, isDragging }}>
      <div ref={setNodeRef} style={style} className={cn('min-w-0', isDragging && 'opacity-40')}>
        {children}
      </div>
    </KanbanItemSortableProvider>
  );
}
