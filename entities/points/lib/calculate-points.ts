import { countAnswered } from '@/entities/journal/lib/build-reflection-entry';
import { REFLECTION_MIN_ANSWERS, REFLECTION_QUESTION_COUNT } from '@/entities/journal/model/types';
import type { Task } from '@/entities/task/model/types';
import type { Goal } from '@/entities/goal/model/types';
import type { JournalEntry } from '@/entities/journal/model/types';
import type { PointEvent } from '../model/types';
import { POINTS_RULES } from '../model/types';

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function buildTaskCompletionEvent(task: Task): PointEvent | null {
  if (!task.completed) return null;

  const completedDay = (task.completedAt ?? new Date().toISOString()).split('T')[0];
  const idempotencyKey = `task:${task.id}:completed`;

  if (!task.deadline) {
    return {
      reason: 'task_completed',
      amount: POINTS_RULES.task.base,
      sourceId: task.id,
      idempotencyKey,
    };
  }

  const deadlineDay = task.deadline.split('T')[0];

  if (completedDay < deadlineDay) {
    return {
      reason: 'task_completed_early',
      amount: POINTS_RULES.task.early,
      sourceId: task.id,
      idempotencyKey,
    };
  }

  if (completedDay === deadlineDay) {
    return {
      reason: 'task_completed_on_time',
      amount: POINTS_RULES.task.onTime,
      sourceId: task.id,
      idempotencyKey,
    };
  }

  return {
    reason: 'task_completed_late',
    amount: POINTS_RULES.task.late,
    sourceId: task.id,
    idempotencyKey,
  };
}

export function buildGoalCompletionEvent(goal: Goal): PointEvent | null {
  if (goal.progress < 100) return null;

  const today = todayDateString();
  const deadlineDay = goal.deadline.split('T')[0];
  const onTime = today <= deadlineDay;

  return {
    reason: onTime ? 'goal_completed_on_time' : 'goal_completed',
    amount: onTime ? POINTS_RULES.goal.completedOnTime : POINTS_RULES.goal.completed,
    sourceId: goal.id,
    idempotencyKey: `goal:${goal.id}:completed`,
  };
}

export function buildJournalEntryEvent(entry: JournalEntry): PointEvent {
  const idempotencyKey = `journal:${entry.id}:created`;

  if (entry.entryType === 'reflection') {
    const answered = countAnswered(entry.reflectionAnswers ?? []);
    const extraAnswers = Math.max(0, answered - REFLECTION_MIN_ANSWERS);
    let amount =
      POINTS_RULES.journal.reflectionBase +
      extraAnswers * POINTS_RULES.journal.reflectionPerExtraAnswer;

    if (answered >= REFLECTION_QUESTION_COUNT) {
      amount += POINTS_RULES.journal.reflectionFullBonus;
    }

    return {
      reason: answered >= REFLECTION_QUESTION_COUNT ? 'journal_reflection_full' : 'journal_reflection',
      amount,
      sourceId: entry.id,
      idempotencyKey,
    };
  }

  return {
    reason: 'journal_free_entry',
    amount: POINTS_RULES.journal.freeEntry,
    sourceId: entry.id,
    idempotencyKey,
  };
}

export function buildHabitDayEvent(habitId: string, date: string): PointEvent {
  return {
    reason: 'habit_day_completed',
    amount: POINTS_RULES.habit.dayCompleted,
    sourceId: habitId,
    idempotencyKey: `habit:${habitId}:day:${date}`,
  };
}

export function buildHabitStreakEvent(habitId: string, streak: number): PointEvent | null {
  if (streak === 7) {
    return {
      reason: 'habit_streak_7',
      amount: POINTS_RULES.habit.streak7,
      sourceId: habitId,
      idempotencyKey: `habit:${habitId}:streak:7`,
    };
  }

  if (streak === 30) {
    return {
      reason: 'habit_streak_30',
      amount: POINTS_RULES.habit.streak30,
      sourceId: habitId,
      idempotencyKey: `habit:${habitId}:streak:30`,
    };
  }

  return null;
}

export function buildTableRowEvent(tableId: string, rowId: string): PointEvent {
  return {
    reason: 'table_row_added',
    amount: POINTS_RULES.table.rowAdded,
    sourceId: rowId,
    idempotencyKey: `table:${tableId}:row:${rowId}:created`,
  };
}

export function buildTableCellEvent(tableId: string, rowId: string, date: string): PointEvent {
  return {
    reason: 'table_cell_updated',
    amount: POINTS_RULES.table.cellUpdated,
    sourceId: rowId,
    idempotencyKey: `table:${tableId}:row:${rowId}:cell:${date}`,
  };
}

export function computeRatingFromTasks(tasks: Task[]): number {
  const overdueOpen = tasks.filter((task) => task.overdue && !task.completed).length;
  const overdueClosed = tasks.filter((task) => task.overdue && task.completed).length;
  const onTimeClosed = tasks.filter(
    (task) =>
      task.completed &&
      task.deadline &&
      !task.overdue &&
      task.completedAt &&
      task.completedAt.split('T')[0] <= task.deadline.split('T')[0]
  ).length;

  return Math.max(
    0,
    Math.min(100, 100 - overdueOpen * 5 - overdueClosed * 2 + onTimeClosed)
  );
}
