'use client';

import { useEffect, useRef } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import { useAccess } from '@/features/access';
import { importPlannerRequest } from '@/entities/planner/api/planner-client';
import { mergePlannerData, type PlannerData } from '@/shared/lib/planner/planner-merge';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';

interface UsePlannerSyncOptions {
  initialPlanner?: PlannerData | null;
}

export function usePlannerSync({ initialPlanner = null }: UsePlannerSyncOptions = {}) {
  const hydrated = useStoreHydrated();
  const { profile } = useAccess();
  const isAuthenticated = isAuthenticatedUser(profile);
  const userId = isAuthenticated ? profile.id : null;
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !userId) return;
    if (syncedFor.current === userId) return;

    const state = useStore.getState();
    const snapshot = {
      goals: state.goals ?? [],
      tasks: state.tasks ?? [],
      goalsKanbanColumnOrder: state.goalsKanbanColumnOrder ?? [],
      tasksKanbanColumnOrder: state.tasksKanbanColumnOrder ?? [],
      outbox: state.plannerOutbox ?? [],
    };
    const maxSeq = snapshot.outbox.reduce((max, item) => Math.max(max, item.seq), 0);
    const localIsEmpty =
      snapshot.goals.length === 0 && snapshot.tasks.length === 0 && snapshot.outbox.length === 0;

    if (localIsEmpty && initialPlanner) {
      state.hydratePlanner(initialPlanner);
    }

    let cancelled = false;

    void importPlannerRequest(snapshot)
      .then((planner) => {
        if (cancelled) return;
        syncedFor.current = userId;
        const current = useStore.getState();
        const snapshotGoalIds = new Set(snapshot.goals.map((goal) => goal.id));
        const snapshotTaskIds = new Set(snapshot.tasks.map((task) => task.id));
        const merged = mergePlannerData(planner, {
          goals: current.goals.filter((goal) => !snapshotGoalIds.has(goal.id)),
          tasks: current.tasks.filter((task) => !snapshotTaskIds.has(task.id)),
        });
        current.hydratePlanner(merged);
        current.clearPlannerOutbox(maxSeq);
      })
      .catch(() => {
        if (cancelled) return;
        if (localIsEmpty && initialPlanner) {
          useStore.getState().hydratePlanner(initialPlanner);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, initialPlanner, userId]);
}
