'use client';

import { TaskCard } from '@/entities/task/ui/TaskCard';
import type { Task, TaskPriority } from '@/entities/task/model/types';
import { getTaskPriorityStyle } from '@/entities/task/lib/get-task-priority-style';
import type { WeekLayoutPatch, WeekLocalStatus, WeekLocalTask, WeekTaskPlacement } from '@/entities/week-local-task/model/types';
import {
  WEEK_BACKLOG_LANE,
  buildWeekLanes,
  cardKey,
  lanesFromCardKeys,
  layoutPatchFromLanes,
  parseCardKey,
  weekBoardProgress,
} from '@/shared/lib/planner/week-board';
import {
  findLane,
  laneDropId,
  parseLaneId,
  placeCardInLanes,
  resolveLane,
} from '@/features/task/lib/week-lane-dnd';
import { toDateInputValue } from '@/shared/lib/planner/week-column-range';
import { useStore } from '@/shared/store/store-config';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { KanbanItemDragHandle, KanbanItemSortableProvider } from '@/shared/ui/kanban-item-sortable';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ListChecks, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useCallback, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const STATUSES: WeekLocalStatus[] = ['todo', 'in_progress', 'done'];

interface WeekPlanningBoardProps {
  dayKeys: string[];
  tasks: Task[];
  localTasks: WeekLocalTask[];
  placements: WeekTaskPlacement[];
  readOnly: boolean;
  onCreate: (input: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: WeekLocalStatus;
    plannedDate: string | null;
  }) => Promise<void>;
  onUpdate: (taskId: string, input: Partial<WeekLocalTask>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onLayout: (patch: WeekLayoutPatch) => void;
}

function statusLabelKey(status: WeekLocalStatus) {
  if (status === 'in_progress') return 'weekBoard.statusInProgress';
  if (status === 'done') return 'weekBoard.statusDone';
  return 'weekBoard.statusTodo';
}

export function WeekPlanningBoard({
  dayKeys,
  tasks,
  localTasks,
  placements,
  readOnly,
  onCreate,
  onUpdate,
  onDelete,
  onLayout,
}: WeekPlanningBoardProps) {
  const lanes = useMemo(
    () =>
      buildWeekLanes(
        dayKeys,
        tasks.map((task) => ({
          id: task.id,
          columnId: task.columnId,
          type: task.type,
          kanbanOrder: task.kanbanOrder,
          completed: task.completed,
        })),
        localTasks,
        placements
      ),
    [dayKeys, localTasks, placements, tasks]
  );
  const laneOrder = useMemo(() => [WEEK_BACKLOG_LANE, ...dayKeys], [dayKeys]);
  const externalItems = useMemo(
    () => Object.fromEntries(laneOrder.map((lane) => [lane, (lanes[lane] ?? []).map(cardKey)])),
    [laneOrder, lanes]
  );
  const [dragItems, setDragItems] = useState<Record<string, string[]> | null>(null);
  const items = dragItems ?? externalItems;
  const itemsRef = useRef(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const localsById = useMemo(() => new Map(localTasks.map((task) => [task.id, task])), [localTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    // Pointer position, so a task can leave a full day for the backlog or another day.
    const pointerCollisions = pointerWithin(args);
    const collisions = pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
    const overId = getFirstCollision(collisions, 'id');
    if (overId == null) return [];

    const lane = parseLaneId(String(overId));
    if (!lane) return [{ id: overId }];

    const itemIds = itemsRef.current[lane] ?? [];
    if (itemIds.length === 0) return [{ id: laneDropId(lane) }];

    const closestItem = closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) =>
        itemIds.includes(String(container.id))
      ),
    });
    return closestItem.length > 0 ? closestItem : [{ id: laneDropId(lane) }];
  }, []);

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (readOnly) return;
    itemsRef.current = items;
    setActiveId(String(active.id));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (readOnly || !over) return;
    const activeItemId = String(active.id);
    if (!parseCardKey(activeItemId)) return;

    const next = placeCardInLanes(
      itemsRef.current,
      activeItemId,
      String(over.id),
      over.data.current as { columnKey?: string } | undefined
    );
    if (!next) return;
    itemsRef.current = next;
    setDragItems(next);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const activeItemId = String(active.id);
    if (!readOnly && over && parseCardKey(activeItemId)) {
      const overId = String(over.id);
      const currentLane = findLane(itemsRef.current, activeItemId);
      const overLane = resolveLane(
        overId,
        itemsRef.current,
        over.data.current as { columnKey?: string } | undefined
      );
      if (currentLane && overLane && currentLane !== overLane) {
        const placed = placeCardInLanes(
          itemsRef.current,
          activeItemId,
          overId,
          over.data.current as { columnKey?: string } | undefined
        );
        if (placed) itemsRef.current = placed;
      }
    }

    const current = itemsRef.current;
    setDragItems(null);
    setActiveId(null);
    if (readOnly || !parseCardKey(activeItemId) || !findLane(current, activeItemId)) return;

    const patch = layoutPatchFromLanes(lanesFromCardKeys(current));
    const before = JSON.stringify(layoutPatchFromLanes(lanes));
    if (JSON.stringify(patch) === before) return;
    onLayout(patch);
  };

  const handleDragCancel = () => {
    itemsRef.current = externalItems;
    setDragItems(null);
    setActiveId(null);
  };

  const activeCard = activeId ? parseCardKey(activeId) : null;
  const activeTask = activeCard?.kind === 'main' ? tasksById.get(activeCard.id) : undefined;
  const activeLocal = activeCard?.kind === 'local' ? localsById.get(activeCard.id) : undefined;

  const columns = laneOrder.map((lane) => (
    <WeekLane
      key={lane}
      lane={lane}
      itemIds={items[lane] ?? []}
      readOnly={readOnly}
      today={lane === toDateInputValue(new Date().toISOString())}
      renderCard={(itemId) => {
        const card = parseCardKey(itemId);
        if (!card) return null;
        if (card.kind === 'main') {
          const task = tasksById.get(card.id);
          if (!task) return null;
          return readOnly ? <StaticMainCard task={task} /> : (
            <TaskCard task={task} showGoalTitle showProjectTitle showType={false} />
          );
        }
        const local = localsById.get(card.id);
        if (!local) return null;
        return (
          <WeekLocalCard
            task={local}
            readOnly={readOnly}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        );
      }}
      onCreate={onCreate}
    />
  ));

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
        <div className="flex w-max min-w-full gap-3 sm:gap-4">{columns}</div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-80 opacity-95 shadow-xl sm:w-96">
            <TaskCard task={activeTask} showGoalTitle showProjectTitle showType={false} />
          </div>
        ) : activeLocal ? (
          <div className="w-80 opacity-95 shadow-xl sm:w-96">
            <WeekLocalCard task={activeLocal} readOnly onUpdate={onUpdate} onDelete={onDelete} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function WeekProgressSummary({
  tasks,
  localTasks,
}: {
  tasks: Array<{ completed: boolean }>;
  localTasks: Array<{ status: string }>;
}) {
  const t = useTranslations('tasks');
  const progress = weekBoardProgress(tasks, localTasks);
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <span className="rounded-full border border-border bg-card px-3 py-1">
        {t('weekBoard.mainProgress', {
          completed: progress.main.completed,
          total: progress.main.total,
        })}
      </span>
      <span className="rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1">
        {t('weekBoard.localProgress', {
          completed: progress.local.completed,
          total: progress.local.total,
        })}
      </span>
      <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
        {t('weekBoard.overallProgress', { percent: progress.overallPercent })}
      </span>
    </div>
  );
}

function WeekLane({
  lane,
  itemIds,
  readOnly,
  today,
  renderCard,
  onCreate,
}: {
  lane: string;
  itemIds: string[];
  readOnly: boolean;
  today: boolean;
  renderCard: (itemId: string) => ReactNode;
  onCreate: WeekPlanningBoardProps['onCreate'];
}) {
  const t = useTranslations('tasks');
  const { over } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: laneDropId(lane),
    data: { type: 'column', columnKey: lane },
    disabled: readOnly,
  });
  const overId = over ? String(over.id) : null;
  const isItemOver = isOver || (overId !== null && itemIds.includes(overId));
  const plannedDate = lane === WEEK_BACKLOG_LANE ? null : lane;

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex w-80 shrink-0 flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-3 sm:w-96',
        today && 'border-primary/50',
        isItemOver && 'border-primary bg-primary/5'
      )}
    >
      <LaneTitle lane={lane} count={itemIds.length} />
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className={cn('min-h-24 flex-1 space-y-2 rounded-lg', isItemOver && 'bg-primary/5')}>
          {itemIds.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('weekBoard.empty')}</p>
          ) : (
            itemIds.map((itemId) => (
              <SortableWeekCard key={itemId} id={itemId} lane={lane} readOnly={readOnly}>
                {renderCard(itemId)}
              </SortableWeekCard>
            ))
          )}
        </div>
      </SortableContext>
      {readOnly ? null : (
        <LocalTaskComposer plannedDate={plannedDate} onCreate={onCreate} />
      )}
    </section>
  );
}

function LaneTitle({ lane, count }: { lane: string; count: number }) {
  const t = useTranslations('tasks');
  if (lane === WEEK_BACKLOG_LANE) {
    return (
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{t('weekBoard.backlog')}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      </div>
    );
  }
  const [year, month, day] = lane.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = WEEKDAY_KEYS[date.getDay()] ?? 'mon';
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold">{t(`weekdays.${weekday}`)}</h2>
        <p className="text-xs text-muted-foreground">
          {day}.{String(month).padStart(2, '0')}
        </p>
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

function SortableWeekCard({
  id,
  lane,
  readOnly,
  children,
}: {
  id: string;
  lane: string;
  readOnly: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: readOnly,
    data: { type: 'item', columnKey: lane },
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

function StaticMainCard({ task }: { task: Task }) {
  const t = useTranslations('tasks');
  const tPriorities = useTranslations('priorities');
  const goals = useStore((state) => state.goals);
  const projects = useStore((state) => state.projects);
  const goal = goals.find((item) => item.id === task.goalId);
  const project = projects.find((item) => item.id === task.projectId);
  const priorityStyle = getTaskPriorityStyle(task.priority);

  return (
    <article className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <Checkbox checked={task.completed} disabled aria-label={t('markCompleted')} />
        <p className={cn('min-w-0 flex-1 text-sm font-medium', task.completed && 'text-muted-foreground line-through')}>
          {task.title}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={cn('rounded-full border px-2 py-0.5 text-[11px]', priorityStyle.badge)}>
          {tPriorities(task.priority)}
        </span>
        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
          {task.completed ? t('weekBoard.statusDone') : t('weekBoard.statusTodo')}
        </span>
      </div>
      {project || goal ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {[project?.title, goal?.title].filter(Boolean).join(' · ')}
        </p>
      ) : null}
    </article>
  );
}

function WeekLocalCard({
  task,
  readOnly,
  onUpdate,
  onDelete,
}: {
  task: WeekLocalTask;
  readOnly: boolean;
  onUpdate: WeekPlanningBoardProps['onUpdate'];
  onDelete: WeekPlanningBoardProps['onDelete'];
}) {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const tPriorities = useTranslations('priorities');
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const done = task.status === 'done';
  const priorityStyle = getTaskPriorityStyle(task.priority);

  const stopDrag = (event: PointerEvent) => event.stopPropagation();

  return (
    <>
      <article className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 shadow-sm">
        <div className="flex items-start gap-2">
          {readOnly ? null : <KanbanItemDragHandle />}
          <Checkbox
            checked={done}
            disabled={readOnly}
            aria-label={t('markCompleted')}
            onPointerDown={stopDrag}
            onCheckedChange={(checked) => {
              void onUpdate(task.id, { status: checked === true ? 'done' : 'todo' }).catch(() => {
                toast.error(t('weekBoard.saveError'));
              });
            }}
          />
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            aria-label={`${t('weekBoard.localBadge')}: ${task.title}`}
            onClick={() => setOpen(true)}
            onPointerDown={stopDrag}
          >
            <span className="flex items-start gap-1.5">
              <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className={cn('text-sm font-medium', done && 'text-muted-foreground line-through')}>
                {task.title}
              </span>
            </span>
          </button>
          {readOnly ? null : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                  aria-label={t('weekBoard.taskActions')}
                  onPointerDown={stopDrag}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {tCommon('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tCommon('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
          <span className={cn('rounded-full border px-2 py-0.5 text-[11px]', priorityStyle.badge)}>
            {tPriorities(task.priority)}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {t(statusLabelKey(task.status))}
          </span>
        </div>
      </article>
      <LocalTaskEditor
        task={task}
        open={open}
        readOnly={readOnly}
        onOpenChange={setOpen}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTaskTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteTaskDescription', { title: task.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                void onDelete(task.id)
                  .then(() => setDeleteOpen(false))
                  .catch(() => undefined);
              }}
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LocalTaskComposer({
  plannedDate,
  onCreate,
}: {
  plannedDate: string | null;
  onCreate: WeekPlanningBoardProps['onCreate'];
}) {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<WeekLocalStatus>('todo');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStatus('todo');
    setError('');
    setOpen(false);
  };

  const submit = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError(t('weekBoard.titleRequired'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onCreate({ title: nextTitle, description: description.trim(), priority, status, plannedDate });
      reset();
    } catch {
      setError(t('weekBoard.saveError'));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={() => setOpen(true)}>
        {t('weekBoard.addTask')}
      </Button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-lg border border-border bg-background p-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Input
        value={title}
        maxLength={200}
        autoFocus
        placeholder={t('taskTitlePlaceholder')}
        aria-label={t('taskTitle')}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Textarea
        value={description}
        maxLength={4000}
        placeholder={t('taskDescriptionPlaceholder')}
        aria-label={t('taskDescription')}
        className="min-h-16"
        onChange={(event) => setDescription(event.target.value)}
      />
      <PriorityField value={priority} onChange={setPriority} />
      <StatusField value={status} onChange={setStatus} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={busy || !title.trim()}>
          {t('weekBoard.create')}
        </Button>
      </div>
    </form>
  );
}

function LocalTaskEditor({
  task,
  open,
  readOnly,
  onOpenChange,
  onUpdate,
  onDelete,
}: {
  task: WeekLocalTask;
  open: boolean;
  readOnly: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: WeekPlanningBoardProps['onUpdate'];
  onDelete: WeekPlanningBoardProps['onDelete'];
}) {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<WeekLocalStatus>(task.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError(t('weekBoard.titleRequired'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onUpdate(task.id, {
        title: nextTitle,
        description: description.trim(),
        priority,
        status,
      });
      onOpenChange(false);
    } catch {
      setError(t('weekBoard.saveError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setTitle(task.title);
          setDescription(task.description ?? '');
          setPriority(task.priority);
          setStatus(task.status);
          setError('');
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('weekBoard.editTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`local-title-${task.id}`}>{t('taskTitle')}</Label>
            <Input
              id={`local-title-${task.id}`}
              value={title}
              maxLength={200}
              disabled={readOnly}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`local-description-${task.id}`}>{t('taskDescription')}</Label>
            <Textarea
              id={`local-description-${task.id}`}
              value={description}
              maxLength={4000}
              disabled={readOnly}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <PriorityField value={priority} disabled={readOnly} onChange={setPriority} />
          <StatusField value={status} disabled={readOnly} onChange={setStatus} />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {readOnly ? null : (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              disabled={busy}
              onClick={() => {
                void onDelete(task.id)
                  .then(() => onOpenChange(false))
                  .catch(() => undefined);
              }}
            >
              {tCommon('delete')}
            </Button>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            {readOnly ? null : (
              <Button type="button" disabled={busy || !title.trim()} onClick={() => void save()}>
                {tCommon('save')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PriorityField({
  value,
  disabled,
  onChange,
}: {
  value: TaskPriority;
  disabled?: boolean;
  onChange: (value: TaskPriority) => void;
}) {
  const t = useTranslations('tasks');
  const tPriorities = useTranslations('priorities');
  return (
    <div className="space-y-1.5">
      <Label>{t('priority')}</Label>
      <Select value={value} disabled={disabled} onValueChange={(next) => onChange(next as TaskPriority)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {tPriorities(priority === 'urgent' ? 'urgentExclaim' : priority)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatusField({
  value,
  disabled,
  onChange,
}: {
  value: WeekLocalStatus;
  disabled?: boolean;
  onChange: (value: WeekLocalStatus) => void;
}) {
  const t = useTranslations('tasks');
  return (
    <div className="space-y-1.5">
      <Label>{t('weekBoard.status')}</Label>
      <Select value={value} disabled={disabled} onValueChange={(next) => onChange(next as WeekLocalStatus)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {t(statusLabelKey(status))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
