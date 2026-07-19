'use client';

import {
  DISPLAY_MODE_ORDER,
  type DisplayMode,
  type DisplaySection,
} from '@/shared/config/display-modes';
import { useDisplayModeSettings } from '@/features/display-modes';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

interface DisplayModeTabsProps {
  section: DisplaySection;
  value: DisplayMode;
  onChange: (value: DisplayMode) => void;
}

const LABEL_KEYS: Record<DisplayMode, 'kanban' | 'list' | 'byDay' | 'calendar'> = {
  kanban: 'kanban',
  list: 'list',
  'by-day': 'byDay',
  calendar: 'calendar',
};

export function DisplayModeTabs({ section, value, onChange }: DisplayModeTabsProps) {
  const { getEnabledModes } = useDisplayModeSettings();
  const t = useTranslations(section);

  const enabledModes = getEnabledModes(section);

  const options = useMemo(
    () =>
      DISPLAY_MODE_ORDER.filter((mode) => enabledModes.includes(mode)).map((mode) => ({
        value: mode,
        label: t(LABEL_KEYS[mode]),
      })),
    [enabledModes, t]
  );

  return <SegmentedControl options={options} value={value} onChange={onChange} />;
}
