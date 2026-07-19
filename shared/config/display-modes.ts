export const DISPLAY_SECTIONS = ['tasks', 'goals'] as const;
export type DisplaySection = (typeof DISPLAY_SECTIONS)[number];

export const SORT_MODES = ['by-day', 'calendar', 'list'] as const;
export type SortMode = (typeof SORT_MODES)[number];

export const DISPLAY_MODES = ['kanban', 'list', 'by-day', 'calendar'] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

export const DISPLAY_MODE_ORDER: DisplayMode[] = [
  'kanban',
  'list',
  'by-day',
  'calendar',
];

export type DisplayModeSettings = Record<
  DisplaySection,
  Record<DisplayMode, boolean>
>;

export function getDefaultDisplayModeSettings(): DisplayModeSettings {
  return {
    tasks: {
      kanban: true,
      list: true,
      'by-day': true,
      calendar: true,
    },
    goals: {
      kanban: true,
      list: true,
      'by-day': true,
      calendar: true,
    },
  };
}

export function getEnabledDisplayModes(
  settings: DisplayModeSettings,
  section: DisplaySection
): DisplayMode[] {
  return DISPLAY_MODE_ORDER.filter((mode) => settings[section][mode]);
}

export function getDefaultDisplayMode(
  settings: DisplayModeSettings,
  section: DisplaySection
): DisplayMode {
  const enabled = getEnabledDisplayModes(settings, section);
  return enabled[0] ?? 'list';
}
