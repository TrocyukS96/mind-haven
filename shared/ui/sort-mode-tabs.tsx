'use client';

import type { SortMode } from '@/shared/config/display-modes';
import { SORT_MODES } from '@/shared/config/display-modes';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { useTranslations } from 'next-intl';

interface SortModeTabsProps {
  value: SortMode;
  onChange: (value: SortMode) => void;
  namespace: 'tasks' | 'goals';
}

export function SortModeTabs({ value, onChange, namespace }: SortModeTabsProps) {
  const t = useTranslations(namespace);

  const options = SORT_MODES.map((mode) => ({
    value: mode,
    label: t(mode === 'by-day' ? 'byDay' : mode),
  }));

  return <SegmentedControl options={options} value={value} onChange={onChange} />;
}
