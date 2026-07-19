'use client';

import { Button } from '@/shared/ui/button';
import { useTranslations } from 'next-intl';

export const TasksTabs = ({
  viewMode,
  setViewMode,
}: {
  viewMode: 'by-day' | 'calendar' | 'list';
  setViewMode: (viewMode: 'by-day' | 'calendar' | 'list') => void;
}) => {
  const t = useTranslations('tasks');

  return (
    <div className="flex rounded-lg border bg-card p-1 w-max">
      <Button
        variant={viewMode === 'by-day' ? 'default' : 'ghost'}
        onClick={() => setViewMode('by-day')}
      >
        {t('byDay')}
      </Button>
      <Button
        variant={viewMode === 'calendar' ? 'default' : 'ghost'}
        onClick={() => setViewMode('calendar')}
      >
        {t('calendar')}
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        onClick={() => setViewMode('list')}
      >
        {t('list')}
      </Button>
    </div>
  );
};
