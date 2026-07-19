'use client';

import { Button } from '@/shared/ui/button';
import { GoalCategory } from '@/entities/goal/model/types';
import { useTranslations } from 'next-intl';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { cn } from '@/shared/lib/utils';

const GoalsFilter = ({
  activeFilter,
  setFilter,
  compact = false,
}: {
  activeFilter: GoalCategory;
  setFilter: (filter: GoalCategory) => void;
  compact?: boolean;
}) => {
  const t = useTranslations('goals');

  const filters: { labelKey: string; value: 'all' | 'week' | 'month' | 'year' }[] = [
    { labelKey: 'allGoals', value: 'all' },
    { labelKey: 'categories.week', value: 'week' },
    { labelKey: 'categories.month', value: 'month' },
    { labelKey: 'categories.year', value: 'year' },
  ];

  const options = filters.map((filter) => ({
    value: filter.value,
    label:
      filter.labelKey === 'allGoals'
        ? t('allGoals')
        : t(filter.labelKey as 'categories.week'),
  }));

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9', activeFilter !== 'all' && 'text-primary bg-primary/10')}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <SegmentedControl
            options={options}
            value={activeFilter}
            onChange={setFilter}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {filters.map((filter) => (
        <GoalsFilterButton
          key={filter.value}
          activeFilter={activeFilter}
          filter={filter.value}
          setFilter={setFilter}
          label={
            filter.labelKey === 'allGoals'
              ? t('allGoals')
              : t(filter.labelKey as 'categories.week')
          }
        />
      ))}
    </div>
  );
};

const GoalsFilterButton = ({
  filter,
  activeFilter,
  setFilter,
  label,
}: {
  filter: GoalCategory;
  activeFilter: GoalCategory;
  setFilter: (filter: GoalCategory) => void;
  label: string;
}) => {
  return (
    <Button
      variant={filter === activeFilter ? 'default' : 'outline'}
      size="sm"
      onClick={() => setFilter(filter)}
    >
      {label}
    </Button>
  );
};

export default GoalsFilter;
