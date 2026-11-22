import { describe, expect, it } from 'vitest';
import type { Goal } from '@/entities/goal/model/types';
import type { Task } from '@/entities/task/model/types';
import {
  collectPlannerTasks,
  EMPTY_PLANNER_SYNC_CURSOR,
  mergePlannerData,
  mergePlannerSyncResult,
  planPlannerSync,
  preparePlannerSync,
  sanitizeGoal,
  type PlannerCache,
  type PlannerData,
} from './planner-merge';

function goal(id: string, extra: Partial<Goal> = {}): Goal {
  return {
    id,
    title: `Goal ${id}`,
    description: '',
    progress: 0,
    deadline: '2026-12-01T00:00:00.000Z',
    category: 'year',
    type: 'backlog',
    priority: 'medium',
    tasks: [],
    ...extra,
  };
}

function task(id: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    completed: false,
    priority: 'medium',
    type: 'backlog',
    createdAt: '2026-11-01T00:00:00.000Z',
    ...extra,
  };
}

function cache(extra: Partial<PlannerCache> = {}): PlannerCache {
  return {
    goals: [],
    tasks: [],
    projects: [],
    projectNotes: {},
    taskColumns: [],
    goalsKanbanColumnOrder: [],
    tasksKanbanColumnOrder: [],
    outbox: [],
    ...extra,
  };
}

function planner(extra: Partial<PlannerData> = {}): PlannerData {
  return {
    goals: [],
    tasks: [],
    projects: [],
    projectNotes: {},
    taskColumns: [],
    goalsKanbanColumnOrder: [],
    tasksKanbanColumnOrder: [],
    ...extra,
  };
}

describe('planPlannerSync', () => {
  it('does not recreate goals and tasks that were deleted on the server', () => {
    const nested = task('task-nested', { goalId: 'goal-1' });
    const plan = planPlannerSync(
      { goalIds: ['goal-db'], taskIds: [], goalsKanbanColumnOrder: [], tasksKanbanColumnOrder: [] },
      {
        goals: [goal('goal-db'), goal('goal-1', { tasks: [nested] })],
        tasks: [task('task-1', { goalId: 'goal-1' })],
        goalsKanbanColumnOrder: ['short', 'backlog'],
        tasksKanbanColumnOrder: [],
        outbox: [],
      }
    );

    expect(plan.goalUpserts).toEqual([]);
    expect(plan.taskUpserts).toEqual([]);
    expect(plan.goalsKanbanColumnOrder).toEqual(['short', 'backlog']);
    expect(plan.writeLayout).toBe(true);
  });

  it('still uploads a goal that failed to save and is waiting in the outbox', () => {
    const plan = planPlannerSync(
      { goalIds: [], taskIds: [], goalsKanbanColumnOrder: [], tasksKanbanColumnOrder: [] },
      {
        goals: [goal('goal-1')],
        tasks: [],
        goalsKanbanColumnOrder: [],
        tasksKanbanColumnOrder: [],
        outbox: [
          {
            seq: 1,
            key: 'goal:goal-1',
            kind: 'upsert-goal',
            entityId: 'goal-1',
            goal: goal('goal-1', { title: 'pending' }),
          },
        ],
      }
    );

    expect(plan.goalUpserts.map((item) => item.title)).toEqual(['pending']);
  });

  it('keeps database column order and applies failed edits from the outbox', () => {
    const plan = planPlannerSync(
      {
        goalIds: ['goal-1'],
        taskIds: ['task-1'],
        goalsKanbanColumnOrder: ['backlog'],
        tasksKanbanColumnOrder: ['backlog'],
      },
      {
        goals: [goal('goal-1', { title: 'stale' })],
        tasks: [task('task-1', { title: 'stale' })],
        goalsKanbanColumnOrder: ['short'],
        tasksKanbanColumnOrder: ['short'],
        outbox: [
          {
            seq: 2,
            key: 'task:task-1',
            kind: 'upsert-task',
            entityId: 'task-1',
            task: task('task-1', { title: 'edited', completed: true }),
          },
          {
            seq: 3,
            key: 'goal:goal-2',
            kind: 'delete-goal',
            entityId: 'goal-2',
          },
        ],
      }
    );

    expect(plan.goalUpserts).toEqual([]);
    expect(plan.taskUpserts[0]?.title).toBe('edited');
    expect(plan.goalDeletes).toEqual(['goal-2']);
    expect(plan.goalsKanbanColumnOrder).toEqual(['backlog']);
    expect(plan.writeLayout).toBe(false);
  });
});

describe('collectPlannerTasks', () => {
  it('includes tasks that were stored only inside a goal', () => {
    const tasks = collectPlannerTasks({
      goals: [goal('goal-1', { tasks: [task('task-1')] })],
      tasks: [],
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.goalId).toBe('goal-1');
  });
});

describe('sanitizeGoal', () => {
  it('drops a goal without a deadline', () => {
    expect(sanitizeGoal(goal('goal-1', { deadline: 'not-a-date' }))).toBeNull();
  });
});

describe('preparePlannerSync', () => {
  it('drops a goal deleted on another device instead of sending it back', () => {
    const prepared = preparePlannerSync(
      planner({ goals: [goal('keep')] }),
      cache({
        goals: [goal('keep'), goal('deleted', { tasks: [task('step', { goalId: 'deleted' })] })],
        tasks: [task('step', { goalId: 'deleted' })],
      }),
      {
        ...EMPTY_PLANNER_SYNC_CURSOR,
        ready: true,
        goalIds: ['keep', 'deleted'],
        taskIds: ['step'],
      }
    );

    expect(prepared.snapshot.goals.map((item) => item.id)).toEqual(['keep']);
    expect(prepared.snapshot.tasks).toEqual([]);
    expect(prepared.queued).toEqual([]);
    expect(prepared.view?.goals.map((item) => item.id)).toEqual(['keep']);
    expect(prepared.blocked.goalIds).toEqual(['deleted']);
    expect(prepared.blocked.taskIds).toEqual(['step']);
  });

  it('keeps a goal created on this device after the last confirmed sync', () => {
    const prepared = preparePlannerSync(
      planner({ goals: [goal('keep')] }),
      cache({ goals: [goal('keep'), goal('fresh')] }),
      { ...EMPTY_PLANNER_SYNC_CURSOR, ready: true, goalIds: ['keep'] }
    );

    expect(prepared.queued.map((item) => item.entityId)).toEqual(['fresh']);
    expect(prepared.snapshot.outbox.map((item) => item.entityId)).toEqual(['fresh']);
    expect(prepared.view?.goals.map((item) => item.id).sort()).toEqual(['fresh', 'keep']);
  });

  it('treats the existing cache as already known on the first sync', () => {
    const prepared = preparePlannerSync(
      planner(),
      cache({ goals: [goal('deleted')], tasks: [task('step')] }),
      EMPTY_PLANNER_SYNC_CURSOR
    );

    expect(prepared.cursor.ready).toBe(true);
    expect(prepared.cursor.goalIds).toEqual(['deleted']);
    expect(prepared.snapshot.goals).toEqual([]);
    expect(prepared.snapshot.tasks).toEqual([]);
    expect(prepared.view?.goals).toEqual([]);
  });

  it('hides a project, column, and note deleted on the server', () => {
    const prepared = preparePlannerSync(
      planner(),
      cache({
        projects: [
          {
            id: 'project-1',
            title: 'Old',
            description: '',
            status: 'active',
            priority: 'medium',
            nextAction: '',
            progress: 0,
            createdAt: '2026-11-01T00:00:00.000Z',
            updatedAt: '2026-11-01T00:00:00.000Z',
          },
        ],
        taskColumns: [
          {
            id: 'column-1',
            title: 'Week',
            kind: 'week',
            sortOrder: 0,
            createdAt: '2026-11-01T00:00:00.000Z',
            updatedAt: '2026-11-01T00:00:00.000Z',
          },
        ],
        projectNotes: {
          'project-1': [
            {
              id: 'note-1',
              projectId: 'project-1',
              content: 'note',
              createdAt: '2026-11-01T00:00:00.000Z',
              updatedAt: '2026-11-01T00:00:00.000Z',
            },
          ],
        },
      }),
      {
        ...EMPTY_PLANNER_SYNC_CURSOR,
        ready: true,
        projectIds: ['project-1'],
        columnIds: ['column-1'],
        noteIds: ['note-1'],
      }
    );

    expect(prepared.view?.projects).toEqual([]);
    expect(prepared.view?.taskColumns).toEqual([]);
    expect(prepared.view?.projectNotes).toEqual({});
  });
});

describe('mergePlannerSyncResult', () => {
  it('does not restore a goal deleted while sync was in flight', () => {
    const merged = mergePlannerSyncResult(
      planner({ goals: [goal('goal-1'), goal('goal-2')], tasks: [task('task-1', { goalId: 'goal-1' })] }),
      cache({ goals: [goal('goal-2')], tasks: [] }),
      {
        goalIds: ['goal-1', 'goal-2'],
        taskIds: ['task-1'],
        projectIds: [],
        columnIds: [],
        noteIds: [],
      },
      { goalIds: [], taskIds: [], projectIds: [], columnIds: [], noteIds: [] },
      { ...EMPTY_PLANNER_SYNC_CURSOR, ready: true, goalIds: ['goal-1', 'goal-2'], taskIds: ['task-1'] }
    );

    expect(merged.goals.map((item) => item.id)).toEqual(['goal-2']);
    expect(merged.tasks).toEqual([]);
  });
});

describe('mergePlannerData', () => {
  it('keeps items created while the sync request was in flight', () => {
    const merged = mergePlannerData(
      {
        goals: [goal('goal-1')],
        tasks: [],
        projects: [],
        projectNotes: {},
        taskColumns: [],
        goalsKanbanColumnOrder: [],
        tasksKanbanColumnOrder: [],
      },
      { goals: [goal('goal-2')], tasks: [task('task-2', { goalId: 'goal-2' })] }
    );

    expect(merged.goals.map((item) => item.id)).toEqual(['goal-1', 'goal-2']);
    expect(merged.goals[1]?.tasks.map((item) => item.id)).toEqual(['task-2']);
  });
});
