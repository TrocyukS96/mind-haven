import { describe, expect, it } from 'vitest';
import type { Goal } from '@/entities/goal/model/types';
import type { Task } from '@/entities/task/model/types';
import { collectPlannerTasks, mergePlannerData, planPlannerSync, sanitizeGoal } from './planner-merge';

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

describe('planPlannerSync', () => {
  it('uploads browser goals and tasks that are missing in the database', () => {
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

    expect(plan.goalUpserts.map((item) => item.id)).toEqual(['goal-1']);
    expect(plan.taskUpserts.map((item) => item.id).sort()).toEqual(['task-1', 'task-nested']);
    expect(plan.goalsKanbanColumnOrder).toEqual(['short', 'backlog']);
    expect(plan.writeLayout).toBe(true);
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

describe('mergePlannerData', () => {
  it('keeps items created while the sync request was in flight', () => {
    const merged = mergePlannerData(
      {
        goals: [goal('goal-1')],
        tasks: [],
        goalsKanbanColumnOrder: [],
        tasksKanbanColumnOrder: [],
      },
      { goals: [goal('goal-2')], tasks: [task('task-2', { goalId: 'goal-2' })] }
    );

    expect(merged.goals.map((item) => item.id)).toEqual(['goal-1', 'goal-2']);
    expect(merged.goals[1]?.tasks.map((item) => item.id)).toEqual(['task-2']);
  });
});
