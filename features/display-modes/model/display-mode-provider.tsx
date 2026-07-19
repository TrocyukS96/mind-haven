'use client';

import type {
  DisplayModeSettings,
  DisplaySection,
  DisplayMode,
} from '@/shared/config/display-modes';
import {
  DISPLAY_MODE_ORDER,
  getDefaultDisplayMode,
  getEnabledDisplayModes,
} from '@/shared/config/display-modes';
import { createContext, useContext, useMemo } from 'react';

interface DisplayModeProviderProps {
  settings: DisplayModeSettings;
  children: React.ReactNode;
}

interface DisplayModeContextValue {
  settings: DisplayModeSettings;
  getEnabledModes: (section: DisplaySection) => DisplayMode[];
  getDefaultMode: (section: DisplaySection) => DisplayMode;
  isModeEnabled: (section: DisplaySection, mode: DisplayMode) => boolean;
}

const DisplayModeContext = createContext<DisplayModeContextValue | null>(null);

export function DisplayModeProvider({
  settings,
  children,
}: DisplayModeProviderProps) {
  const value = useMemo<DisplayModeContextValue>(
    () => ({
      settings,
      getEnabledModes: (section) => getEnabledDisplayModes(settings, section),
      getDefaultMode: (section) => getDefaultDisplayMode(settings, section),
      isModeEnabled: (section, mode) => settings[section][mode],
    }),
    [settings]
  );

  return (
    <DisplayModeContext.Provider value={value}>
      {children}
    </DisplayModeContext.Provider>
  );
}

export function useDisplayModeSettings(): DisplayModeContextValue {
  const context = useContext(DisplayModeContext);

  if (!context) {
    throw new Error('useDisplayModeSettings must be used within DisplayModeProvider');
  }

  return context;
}

export function resolveDisplayMode(
  section: DisplaySection,
  currentMode: DisplayMode,
  settings: DisplayModeSettings
): DisplayMode {
  if (settings[section][currentMode]) {
    return currentMode;
  }

  return getDefaultDisplayMode(settings, section);
}

export { DISPLAY_MODE_ORDER };
