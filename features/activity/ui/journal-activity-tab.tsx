'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { DEFAULT_ACTIVITY_FILTER } from '@/entities/activity/model/types';
import { useActivitySync } from '../hooks/use-activity-sync';
import { ActivityFilter } from './activity-filter';
import { ActivityTimeline } from './activity-timeline';
import { selectVisibleActivityEvents } from '@/shared/store/slices/activity-slice';
import { useStore } from '@/shared/store/store-config';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { EmptyState } from '@/shared/ui/empty-state';
import { useTranslations } from 'next-intl';

export function JournalActivityTab() {
  const t = useTranslations('activity');
  const activityEvents = useStore((state) => state.activityEvents);
  const activityFilter = useStore((state) => state.activityFilter);
  const setActivityFilter = useStore((state) => state.setActivityFilter);
  const loadActivityEvents = useStore((state) => state.loadActivityEvents);
  const activityNextCursor = useStore((state) => state.activityNextCursor);
  const isActivityLoading = useStore((state) => state.isActivityLoading);
  const isActivityLoadingMore = useStore((state) => state.isActivityLoadingMore);
  const activityApiEnabled = useStore((state) => state.activityApiEnabled);
  const [search, setSearch] = useState(activityFilter.search);

  useActivitySync(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search === activityFilter.search) {
        return;
      }

      setActivityFilter({ ...activityFilter, search });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [activityFilter, search, setActivityFilter]);

  const visibleEvents = useMemo(
    () => selectVisibleActivityEvents(activityEvents, activityFilter, activityApiEnabled),
    [activityApiEnabled, activityEvents, activityFilter]
  );

  const isFilterActive =
    activityFilter.datePreset !== 'all' ||
    activityFilter.category !== 'all' ||
    Boolean(activityFilter.search.trim());

  const isEmptyCatalog = activityEvents.length === 0 && !isFilterActive;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                className="w-full min-w-0"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <ActivityFilter
              filter={activityFilter}
              onApply={setActivityFilter}
              onReset={() => {
                setSearch('');
                setActivityFilter(DEFAULT_ACTIVITY_FILTER);
              }}
              isActive={isFilterActive}
            />
          </div>
        </CardContent>
      </Card>

      {isActivityLoading && visibleEvents.length === 0 ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-xl bg-muted" />
          <div className="h-16 rounded-xl bg-muted" />
        </div>
      ) : visibleEvents.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={isEmptyCatalog ? t('empty') : t('emptyFiltered')}
          description={isEmptyCatalog ? t('emptyDescription') : t('emptyFilteredDescription')}
        />
      ) : (
        <>
          <ActivityTimeline events={visibleEvents} />
          {activityApiEnabled && activityNextCursor && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => void loadActivityEvents({ reset: false })}
                disabled={isActivityLoadingMore}
              >
                {isActivityLoadingMore ? t('loadingMore') : t('loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
