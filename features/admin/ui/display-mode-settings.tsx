'use client';

import {
  DISPLAY_MODES,
  DISPLAY_SECTIONS,
  type DisplayMode,
  type DisplayModeSettings,
  type DisplaySection,
} from '@/shared/config/display-modes';
import { Checkbox } from '@/shared/ui/checkbox';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface DisplayModeSettingsPanelProps {
  initialSettings: DisplayModeSettings;
  section?: DisplaySection;
  hideHeader?: boolean;
}

const MODE_LABEL_KEYS: Record<DisplayMode, 'kanban' | 'list' | 'byDay' | 'calendar'> = {
  kanban: 'kanban',
  list: 'list',
  'by-day': 'byDay',
  calendar: 'calendar',
};

export function DisplayModeSettingsPanel({
  initialSettings,
  section,
  hideHeader = false,
}: DisplayModeSettingsPanelProps) {
  const t = useTranslations('admin.displayModes');
  const tTasks = useTranslations('tasks');
  const tGoals = useTranslations('goals');
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sections = section ? [section] : DISPLAY_SECTIONS;

  const getModeLabel = (currentSection: DisplaySection, mode: DisplayMode) => {
    const translator = currentSection === 'tasks' ? tTasks : tGoals;
    return translator(MODE_LABEL_KEYS[mode]);
  };

  const handleToggle = async (
    currentSection: DisplaySection,
    mode: DisplayMode,
    enabled: boolean
  ) => {
    const nextSettings: DisplayModeSettings = {
      ...settings,
      [currentSection]: {
        ...settings[currentSection],
        [mode]: enabled,
      },
    };

    setSettings(nextSettings);
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/display-modes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            [currentSection]: { [mode]: enabled },
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update display mode settings');
      }

      const data = (await response.json()) as { settings: DisplayModeSettings };
      setSettings(data.settings);
      setMessage(t('saved'));
    } catch {
      setSettings(settings);
      setMessage(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-3">
      {hideHeader ? (
        <h3 className="text-sm font-medium">{t('compactTitle')}</h3>
      ) : (
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
      )}

      <div className="rounded-xl border border-border divide-y divide-border">
        {sections.map((currentSection) => (
          <div key={currentSection} className="p-3 space-y-2">
            {!section && <h3 className="font-medium">{t(`sections.${currentSection}`)}</h3>}
            <div className="space-y-1">
              {DISPLAY_MODES.map((mode) => (
                <label
                  key={`${currentSection}-${mode}`}
                  className="flex items-center gap-3 cursor-pointer hover:bg-accent/40 rounded-lg p-1.5 -mx-1.5"
                >
                  <Checkbox
                    checked={settings[currentSection][mode]}
                    disabled={isSaving}
                    onCheckedChange={(checked) =>
                      handleToggle(currentSection, mode, checked === true)
                    }
                  />
                  <span className="text-sm">{getModeLabel(currentSection, mode)}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
