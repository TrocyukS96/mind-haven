'use client';

import { useEffect, useRef } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import { useAccess } from '@/features/access';
import { importPlannerRequest } from '@/entities/planner/api/planner-client';
import {
  collectPlannerTasks,
  cursorFromPlanner,
  EMPTY_PLANNER_SYNC_CURSOR,
  mergePlannerSyncResult,
  preparePlannerSync,
} from '@/shared/lib/planner/planner-merge';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';

interface UsePlannerSyncOptions {
  initialPlanner?: Parameters<typeof preparePlannerSync>[0];
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
    const prepared = preparePlannerSync(
      initialPlanner,
      {
        goals: state.goals ?? [],
        tasks: state.tasks ?? [],
        projects: state.projects ?? [],
        projectNotes: state.projectNotes ?? {},
        taskColumns: state.taskColumns ?? [],
        goalsKanbanColumnOrder: state.goalsKanbanColumnOrder ?? [],
        tasksKanbanColumnOrder: state.tasksKanbanColumnOrder ?? [],
        outbox: state.plannerOutbox ?? [],
      },
      { ...EMPTY_PLANNER_SYNC_CURSOR, ...state.plannerSyncCursor }
    );

    if (!state.plannerSyncCursor?.ready) {
      state.setPlannerSyncCursor(prepared.cursor);
    }

    if (prepared.queued.length > 0) {
      state.appendPlannerOutbox(prepared.queued);
    }

    const outbox = useStore.getState().plannerOutbox ?? [];
    const snapshot = { ...prepared.snapshot, outbox };
    const maxSeq = outbox.reduce((max, item) => Math.max(max, item.seq), 0);
    const started = {
      goalIds: (state.goals ?? []).map((goal) => goal.id),
      taskIds: collectPlannerTasks(state).map((task) => task.id),
      projectIds: (state.projects ?? []).map((project) => project.id),
      columnIds: (state.taskColumns ?? []).map((column) => column.id),
      noteIds: Object.values(state.projectNotes ?? {})
        .flat()
        .map((note) => note.id),
    };

    if (prepared.view) {
      useStore.getState().hydratePlanner(prepared.view);
    }

    let cancelled = false;

    void importPlannerRequest(snapshot)
      .then((planner) => {
        if (cancelled) return;
        syncedFor.current = userId;
        const current = useStore.getState();
        const merged = mergePlannerSyncResult(
          planner,
          {
            goals: current.goals ?? [],
            tasks: current.tasks ?? [],
            projects: current.projects ?? [],
            projectNotes: current.projectNotes ?? {},
            taskColumns: current.taskColumns ?? [],
            goalsKanbanColumnOrder: current.goalsKanbanColumnOrder ?? [],
            tasksKanbanColumnOrder: current.tasksKanbanColumnOrder ?? [],
            outbox: (current.plannerOutbox ?? []).filter((item) => item.seq > maxSeq),
          },
          started,
          prepared.blocked,
          prepared.cursor
        );
        current.hydratePlanner(merged);
        current.setPlannerSyncCursor(cursorFromPlanner(planner, merged));
        current.clearPlannerOutbox(maxSeq);
      })
      .catch(() => {
        if (cancelled) return;
        if (prepared.view) {
          useStore.getState().hydratePlanner(prepared.view);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, initialPlanner, userId]);
}
