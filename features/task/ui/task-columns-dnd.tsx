'use client';

import { TaskCard } from '@/entities/task/ui/TaskCard';
import type { Task } from '@/entities/task/model/types';
import type { TaskColumn } from '@/entities/task-column/model/types';
import {
  columnDropId,
  findColumnId,
  parseColumnDropId,
  placeTaskInColumns,
  resolveOverColumnId,
  type ColumnItemsMap,
} from '@/features/task/lib/task-column-dnd';
import { TaskColumnMenu } from '@/features/task/ui/task-column-menu';
import { getColumnId, parseColumnId, sortByKanbanOrder } from '@/shared/lib/kanban-utils';
import { resolveTaskColumnId } from '@/shared/lib/planner/week-column-range';
import { KanbanItemSortableProvider } from '@/shared/ui/kanban-item-sortable';
import { cn } from '@/shared/lib/utils';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDndContext,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
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
import { Link } from '@/i18n/routing';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

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

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const activeId = String(args.active.id);
    const activeType =
      (args.active.data.current as { type?: 'column' | 'item' } | undefined)?.type ??
      (parseColumnId(activeId) ? 'column' : 'item');

    if (activeType === 'column') {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((container) =>
          Boolean(parseColumnId(String(container.id)))
        ),
      });
    }

    // Pointer position, so an empty week column between filled columns can accept a task.
    const containers = args.droppableContainers.filter(
      (container) => !parseColumnId(String(container.id))
    );
    const scoped = { ...args, droppableContainers: containers };
    const pointerCollisions = pointerWithin(scoped);
    const collisions = pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(scoped);
    const overId = getFirstCollision(collisions, 'id');
    if (overId == null) return [];

    const overColumnId = parseColumnDropId(String(overId));
    if (!overColumnId) return [{ id: overId }];

    const itemIds = columnItemsRef.current[overColumnId] ?? [];
    if (itemIds.length === 0) return [{ id: columnDropId(overColumnId) }];

    const closestItem = closestCenter({
      ...args,
      droppableContainers: containers.filter((container) => itemIds.includes(String(container.id))),
    });
    return closestItem.length > 0 ? closestItem : [{ id: columnDropId(overColumnId) }];
  }, []);

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

    const next = placeTaskInColumns(
      columnItemsRef.current,
      String(active.id),
      String(over.id),
      over.data.current as { columnKey?: string } | undefined
    );
    if (!next) return;
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
      if (overId) {
        const currentColumn = findColumnId(columnItemsRef.current, currentActiveId);
        const overColumn = resolveOverColumnId(
          overId,
          columnItemsRef.current,
          over?.data.current as { columnKey?: string } | undefined
        );
        if (currentColumn && overColumn && currentColumn !== overColumn) {
          const placed = placeTaskInColumns(
            columnItemsRef.current,
            currentActiveId,
            overId,
            over?.data.current as { columnKey?: string } | undefined
          );
          if (placed) columnItemsRef.current = placed;
        }
      }

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
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
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
          <div className="w-80 cursor-grabbing opacity-95 shadow-xl sm:w-96">
            <TaskCard task={activeTask} showGoalTitle showProjectTitle showType={false} />
          </div>
        ) : activeColumn ? (
          <div className="w-80 rounded-xl border border-primary bg-card px-4 py-3 text-sm font-semibold shadow-xl sm:w-96">
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
  const { over } = useDndContext();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver: isColumnOver,
  } = useSortable({
    id: getColumnId(column.id),
    data: { type: 'column', columnKey: column.id },
  });
  const { setNodeRef: setDroppableRef, isOver: isDropOver } = useDroppable({
    id: columnDropId(column.id),
    data: { type: 'column', columnKey: column.id },
  });
  const setColumnNode = useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      setDroppableRef(node);
    },
    [setDroppableRef, setNodeRef]
  );
  const overId = over ? String(over.id) : null;
  const isItemOver = isDropOver || (overId !== null && itemIds.includes(overId));

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setColumnNode}
      style={style}
      className={cn(
        'flex w-80 shrink-0 flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-3 sm:w-96 sm:p-4',
        column.kind === 'week' && 'border-primary/40',
        isDragging && 'border-primary opacity-60',
        (isColumnOver || isItemOver) && 'border-primary bg-primary/5'
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
          {column.kind === 'week' ? (
            <Link
              href={`/tasks/weeks/${column.id}`}
              className="inline-flex text-xs font-medium text-primary hover:underline"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {t('weekBoard.open')}
            </Link>
          ) : null}
        </div>
        <TaskColumnMenu column={column} />
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className={cn('min-h-24 flex-1 space-y-2 rounded-lg', isItemOver && 'bg-primary/5')}>
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
      <div
        ref={setNodeRef}
        style={style}
        className={cn('min-w-0 touch-none', isDragging && 'opacity-40')}
      >
        {children}
      </div>
    </KanbanItemSortableProvider>
  );
}
