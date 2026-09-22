import type { ActivityEvent } from '../model/types';
import { toDateKey } from '@/shared/lib/filters/date-presets';

export interface ActivityDayGroup {
  dateKey: string;
  events: ActivityEvent[];
}

export function groupActivityByDate(events: ActivityEvent[]): ActivityDayGroup[] {
  const groups = new Map<string, ActivityEvent[]>();

  for (const event of events) {
    const dateKey = toDateKey(event.createdAt);
    const existing = groups.get(dateKey);

    if (existing) {
      existing.push(event);
    } else {
      groups.set(dateKey, [event]);
    }
  }

  return [...groups.entries()].map(([dateKey, groupedEvents]) => ({
    dateKey,
    events: groupedEvents,
  }));
}
