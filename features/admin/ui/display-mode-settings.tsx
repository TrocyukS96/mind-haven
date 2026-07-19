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
}

const MODE_LABEL_KEYS: Record<DisplayMode, 'kanban' | 'list' | 'byDay' | 'calendar'> = {
  kanban: 'kanban',
  list: 'list',
  'by-day': 'byDay',
  calendar: 'calendar',
};

export function DisplayModeSettingsPanel({
  initialSettings,
}: DisplayModeSettingsPanelProps) {
  const t = useTranslations('admin.displayModes');
  const tTasks = useTranslations('tasks');
  const tGoals = useTranslations('goals');
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const getModeLabel = (section: DisplaySection, mode: DisplayMode) => {
    const translator = section === 'tasks' ? tTasks : tGoals;
    return translator(MODE_LABEL_KEYS[mode]);
  };

  const handleToggle = async (
    section: DisplaySection,
    mode: DisplayMode,
    enabled: boolean
  ) => {
    const nextSettings: DisplayModeSettings = {
      ...settings,
      [section]: {
        ...settings[section],
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
            [section]: { [mode]: enabled },
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
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <div className="rounded-xl border border-border divide-y divide-border">
        {DISPLAY_SECTIONS.map((section) => (
          <div key={section} className="p-4 space-y-3">
            <h3 className="font-medium">{t(`sections.${section}`)}</h3>
            <div className="space-y-2">
              {DISPLAY_MODES.map((mode) => (
                <label
                  key={`${section}-${mode}`}
                  className="flex items-center gap-3 cursor-pointer hover:bg-accent/40 rounded-lg p-2 -mx-2"
                >
                  <Checkbox
                    checked={settings[section][mode]}
                    disabled={isSaving}
                    onCheckedChange={(checked) =>
                      handleToggle(section, mode, checked === true)
                    }
                  />
                  <span className="text-sm">{getModeLabel(section, mode)}</span>
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
