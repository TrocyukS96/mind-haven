import {
  createActivityEventRequest,
  fetchActivityEvents,
} from '@/entities/activity/api/activity-client';
import { shouldUseActivityApi } from '@/entities/activity/lib/resolve-activity-api';
import {
  DEFAULT_ACTIVITY_FILTER,
  type ActivityEvent,
  type ActivityEventInput,
  type ActivityFilterState,
  type ActivityListResult,
} from '@/entities/activity/model/types';
import { resolveDatePresetRange } from '@/shared/lib/filters/date-presets';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

export const ACTIVITY_PAGE_SIZE = 50;

export interface ActivitySlice {
  activityEvents: ActivityEvent[];
  activityApiEnabled: boolean;
  activityFilter: ActivityFilterState;
  activityNextCursor: string | null;
  isActivityLoading: boolean;
  isActivityLoadingMore: boolean;
  hasLoadedActivity: boolean;
  setActivityApiEnabled: (enabled: boolean) => void;
  setActivityFilter: (filter: ActivityFilterState) => void;
  hydrateActivity: (data: ActivityListResult) => void;
  loadActivityEvents: (options?: { reset?: boolean }) => Promise<void>;
  recordActivity: (input: ActivityEventInput) => Promise<void>;
}

function matchesLocalFilter(event: ActivityEvent, filter: ActivityFilterState): boolean {
  const range = resolveDatePresetRange(filter.datePreset, {
    from: filter.dateFrom,
    to: filter.dateTo,
  });
  const dateKey = event.createdAt.slice(0, 10);

  if (range.from && dateKey < range.from) {
    return false;
  }

  if (range.to && dateKey > range.to) {
    return false;
  }

  if (filter.category !== 'all' && event.entityType !== filter.category) {
    const categoryPrefix = `${filter.category}_`;
    if (!event.type.startsWith(categoryPrefix) && event.entityType !== filter.category) {
      return false;
    }
  }

  if (filter.search.trim()) {
    const query = filter.search.trim().toLowerCase();
    const haystack = `${event.title} ${event.type}`.toLowerCase();
    if (!haystack.includes(query)) {
      return false;
    }
  }

  return true;
}

function upsertEvent(events: ActivityEvent[], event: ActivityEvent): ActivityEvent[] {
  if (events.some((item) => item.id === event.id)) {
    return events;
  }

  return [event, ...events].sort((left, right) => {
    if (left.createdAt === right.createdAt) {
      return right.id.localeCompare(left.id);
    }
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export const createActivitySlice: StateCreator<AppStore, [], [], ActivitySlice> = (set, get) => ({
  activityEvents: [],
  activityApiEnabled: false,
  activityFilter: DEFAULT_ACTIVITY_FILTER,
  activityNextCursor: null,
  isActivityLoading: false,
  isActivityLoadingMore: false,
  hasLoadedActivity: false,

  setActivityApiEnabled: (enabled) => set({ activityApiEnabled: enabled }),

  setActivityFilter: (filter) => set({ activityFilter: filter }),

  hydrateActivity: (data) =>
    set({
      activityEvents: data.events,
      activityNextCursor: data.nextCursor,
      hasLoadedActivity: true,
    }),

  loadActivityEvents: async ({ reset = false } = {}) => {
    const filter = get().activityFilter;
    const range = resolveDatePresetRange(filter.datePreset, {
      from: filter.dateFrom,
      to: filter.dateTo,
    });

    if (!(await shouldUseActivityApi())) {
      set({ hasLoadedActivity: true, activityNextCursor: null });
      return;
    }

    if (reset) {
      set({ isActivityLoading: true });
    } else {
      if (!get().activityNextCursor || get().isActivityLoadingMore) {
        return;
      }
      set({ isActivityLoadingMore: true });
    }

    try {
      const data = await fetchActivityEvents({
        cursor: reset ? null : get().activityNextCursor,
        limit: ACTIVITY_PAGE_SIZE,
        filter: {
          ...filter,
          dateFrom: range.from,
          dateTo: range.to,
        },
      });

      set((state) => ({
        activityEvents: reset ? data.events : [...state.activityEvents, ...data.events],
        activityNextCursor: data.nextCursor,
        hasLoadedActivity: true,
      }));
    } catch {
      set({ hasLoadedActivity: true });
    } finally {
      set({ isActivityLoading: false, isActivityLoadingMore: false });
    }
  },

  recordActivity: async (input) => {
    if (await shouldUseActivityApi()) {
      try {
        const event = await createActivityEventRequest(input);
        set((state) => ({
          activityEvents: upsertEvent(state.activityEvents, event),
        }));
      } catch {
        const event: ActivityEvent = {
          id: input.idempotencyKey,
          type: input.type,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          title: input.title,
          metadata: { ...input.metadata, idempotencyKey: input.idempotencyKey },
          createdAt: input.createdAt ?? new Date().toISOString(),
        };
        set((state) => ({
          activityEvents: upsertEvent(state.activityEvents, event),
        }));
      }
      return;
    }

    const alreadyExists = get().activityEvents.some(
      (event) => event.id === input.idempotencyKey || event.metadata.idempotencyKey === input.idempotencyKey
    );
    if (alreadyExists) {
      return;
    }

    const localExists = get().activityEvents.some(
      (event) =>
        `${event.type}:${event.entityId}:${event.createdAt}` === input.idempotencyKey
    );
    if (localExists) {
      return;
    }

    const event: ActivityEvent = {
      id: input.idempotencyKey,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      title: input.title,
      metadata: { ...input.metadata, idempotencyKey: input.idempotencyKey },
      createdAt: input.createdAt ?? new Date().toISOString(),
    };

    if (get().activityEvents.some((item) => item.id === event.id)) {
      return;
    }

    set((state) => ({
      activityEvents: upsertEvent(state.activityEvents, event),
    }));
  },
});

export function selectVisibleActivityEvents(
  events: ActivityEvent[],
  filter: ActivityFilterState,
  useApi: boolean
): ActivityEvent[] {
  if (useApi) {
    return events;
  }

  return events.filter((event) => matchesLocalFilter(event, filter));
}
