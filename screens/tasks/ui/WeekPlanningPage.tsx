'use client';

import { PlannerApiError } from '@/entities/planner/api/planner-client';
import {
  createWeekLocalTaskRequest,
  deleteWeekLocalTaskRequest,
  getWeekBoardRequest,
  saveWeekLayoutRequest,
  updateWeekLocalTaskRequest,
  type WeekBoardPayload,
} from '@/entities/week-local-task/api/week-local-task-client';
import type { WeekLayoutPatch, WeekLocalTask, WeekTaskPlacement } from '@/entities/week-local-task/model/types';
import { WeekPlanningBoard, WeekProgressSummary } from '@/features/task/ui/week-planning-board';
import { Link } from '@/i18n/routing';
import { applyLayoutPatch, weekDayKeys } from '@/shared/lib/planner/week-board';
import { formatColumnDate } from '@/shared/lib/planner/week-column-range';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

export function WeekPlanningPage({ columnId }: { columnId: string }) {
  const t = useTranslations('tasks');
  const storeTasks = useStore((state) => state.tasks);
  const [board, setBoard] = useState<WeekBoardPayload | null>(null);
  const [localTasks, setLocalTasks] = useState<WeekLocalTask[]>([]);
  const [placements, setPlacements] = useState<WeekTaskPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not-found' | 'load' | null>(null);
  const localRef = useRef(localTasks);
  const placementRef = useRef(placements);
  const saveChain = useRef(Promise.resolve());
  const layoutGeneration = useRef(0);
  localRef.current = localTasks;
  placementRef.current = placements;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getWeekBoardRequest(columnId)
      .then((payload) => {
        if (cancelled) return;
        setBoard(payload);
        setLocalTasks(payload.localTasks);
        setPlacements(payload.placements);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        const status = reason instanceof PlannerApiError ? reason.status : 0;
        setError(status === 404 ? 'not-found' : 'load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [columnId]);

  const tasks = useMemo(() => {
    if (!board) return [];
    const byId = new Map(storeTasks.map((task) => [task.id, task]));
    return board.tasks.map((task) => byId.get(task.id) ?? task);
  }, [board, storeTasks]);

  const applySaved = (saved: WeekBoardPayload) => {
    setBoard(saved);
    setLocalTasks(saved.localTasks);
    setPlacements(saved.placements);
  };

  const saveLayout = (patch: WeekLayoutPatch) => {
    const generation = ++layoutGeneration.current;
    const next = applyLayoutPatch(localRef.current, placementRef.current, patch, columnId);
    localRef.current = next.localTasks;
    placementRef.current = next.placements;
    setLocalTasks(next.localTasks);
    setPlacements(next.placements);
    saveChain.current = saveChain.current
      .catch(() => undefined)
      .then(async () => {
        const saved = await saveWeekLayoutRequest(columnId, patch);
        if (layoutGeneration.current === generation) applySaved(saved);
      })
      .catch(() => {
        if (layoutGeneration.current !== generation) return;
        toast.error(t('weekBoard.saveError'));
        return getWeekBoardRequest(columnId)
          .then((saved) => {
            if (layoutGeneration.current === generation) applySaved(saved);
          })
          .catch(() => undefined);
      });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('weekBoard.loading')}</p>;
  }

  if (error || !board) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">
          {error === 'not-found' ? t('weekBoard.notFound') : t('weekBoard.loadError')}
        </p>
      </div>
    );
  }

  const from = formatColumnDate(board.column.dateFrom);
  const to = formatColumnDate(board.column.dateTo);
  const readOnly = Boolean(board.column.archivedAt);
  const dayKeys = weekDayKeys(board.column.dateFrom, board.column.dateTo);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <BackLink />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{board.column.title}</h1>
            {from && to ? (
              <p className="text-sm text-muted-foreground">
                {from}–{to}
              </p>
            ) : null}
          </div>
          {readOnly ? <p className="text-sm text-muted-foreground">{t('weekBoard.archivedHint')}</p> : null}
        </div>
      </div>
      <WeekProgressSummary tasks={tasks} localTasks={localTasks} />
      <WeekPlanningBoard
        dayKeys={dayKeys}
        tasks={tasks}
        localTasks={localTasks}
        placements={placements}
        readOnly={readOnly}
        onCreate={async (input) => {
          const created = await createWeekLocalTaskRequest(columnId, input);
          setLocalTasks((current) => [...current, created]);
        }}
        onUpdate={async (taskId, input) => {
          const previous = localRef.current;
          setLocalTasks((current) =>
            current.map((task) => (task.id === taskId ? { ...task, ...input } : task))
          );
          try {
            const saved = await updateWeekLocalTaskRequest(columnId, taskId, {
              title: input.title,
              description: input.description,
              priority: input.priority,
              status: input.status,
              plannedDate: input.plannedDate,
              sortOrder: input.sortOrder,
            });
            setLocalTasks((current) => current.map((task) => (task.id === taskId ? saved : task)));
          } catch (reason) {
            setLocalTasks(previous);
            throw reason;
          }
        }}
        onDelete={async (taskId) => {
          const previous = localRef.current;
          setLocalTasks((current) => current.filter((task) => task.id !== taskId));
          try {
            await deleteWeekLocalTaskRequest(columnId, taskId);
            toast.success(t('taskDeleted'));
          } catch (reason) {
            setLocalTasks(previous);
            toast.error(t('weekBoard.saveError'));
            throw reason;
          }
        }}
        onLayout={saveLayout}
      />
    </div>
  );
}

function BackLink() {
  const t = useTranslations('tasks');
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href="/tasks">
        <ArrowLeft className="h-4 w-4" />
        {t('weekBoard.back')}
      </Link>
    </Button>
  );
}
