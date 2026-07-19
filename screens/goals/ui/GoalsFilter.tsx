'use client';

import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { GoalCategory } from '@/entities/goal/model/types';
import { useTranslations } from 'next-intl';

const GoalsFilter = ({
  activeFilter,
  setFilter,
}: {
  activeFilter: GoalCategory;
  setFilter: (filter: GoalCategory) => void;
}) => {
  const t = useTranslations('goals');

  const filters: { labelKey: string; value: 'all' | 'week' | 'month' | 'year' }[] = [
    { labelKey: 'allGoals', value: 'all' },
    { labelKey: 'categories.week', value: 'week' },
    { labelKey: 'categories.month', value: 'month' },
    { labelKey: 'categories.year', value: 'year' },
  ];

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
