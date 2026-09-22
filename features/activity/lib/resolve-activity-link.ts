import type { ActivityEvent } from '@/entities/activity/model/types';
import { getActivityCategory } from '@/entities/activity/model/catalog';
import type { AppStore } from '@/shared/store/store-config';

export type ActivityLinkAction =
  | { kind: 'journal'; entryId: string }
  | { kind: 'task'; taskId: string }
  | { kind: 'goal'; goalId: string }
  | { kind: 'habit' }
  | { kind: 'energy'; checkInId: string };

export function resolveActivityLink(
  event: ActivityEvent,
  store: Pick<AppStore, 'journalEntries' | 'tasks' | 'goals' | 'habits' | 'energyCheckIns'>
): ActivityLinkAction | null {
  const category = getActivityCategory(event.type) ?? event.entityType;
  const entityId = event.entityId;

  if (!entityId) {
    return null;
  }

  if (category === 'JOURNAL' || category === 'REFLECTION') {
    return store.journalEntries.some((entry) => entry.id === entityId)
      ? { kind: 'journal', entryId: entityId }
      : null;
  }

  if (category === 'TASK') {
    return store.tasks.some((task) => task.id === entityId)
      ? { kind: 'task', taskId: entityId }
      : null;
  }

  if (category === 'GOAL') {
    return store.goals.some((goal) => goal.id === entityId)
      ? { kind: 'goal', goalId: entityId }
      : null;
  }

  if (category === 'HABIT') {
    return store.habits.some((habit) => habit.id === entityId) ? { kind: 'habit' } : null;
  }

  if (category === 'ENERGY') {
    return store.energyCheckIns.some((checkIn) => checkIn.id === entityId)
      ? { kind: 'energy', checkInId: entityId }
      : null;
  }

  return null;
}
