'use client';

import {
  DISPLAY_SECTIONS,
  type DisplayModeSettings,
} from '@/shared/config/display-modes';
import {
  getAdminToggleableFeatures,
  type FeatureKey,
} from '@/shared/config/features';
import type { ItemTypeCatalog } from '@/shared/config/item-types';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AdminTabs } from './admin-tabs';
import { DisplayModeSettingsPanel } from './display-mode-settings';
import { FeatureSettings } from './feature-settings';
import { ItemTypeSettingsPanel } from './item-type-settings';

interface FeatureVisibilityPanelProps {
  initialFlags: Record<FeatureKey, boolean>;
  initialDisplayModeSettings: DisplayModeSettings;
  initialItemTypes: ItemTypeCatalog;
}

export function FeatureVisibilityPanel({
  initialFlags,
  initialDisplayModeSettings,
  initialItemTypes,
}: FeatureVisibilityPanelProps) {
  const t = useTranslations('admin');
  const tFeatures = useTranslations('admin.features');
  const toggleableFeatures = useMemo(() => {
    const preferredOrder: FeatureKey[] = ['tasks', 'goals'];

    return [...getAdminToggleableFeatures()]
      .filter((feature) => feature.key !== 'dashboard')
      .sort((left, right) => {
        const rank = (key: FeatureKey) => {
          const index = preferredOrder.indexOf(key);
          return index === -1 ? preferredOrder.length : index;
        };

        return rank(left.key) - rank(right.key);
      });
  }, []);
  const [featureKey, setFeatureKey] = useState<FeatureKey>('tasks');

  const tabs = toggleableFeatures.map((feature) => ({
    value: feature.key,
    label: tFeatures(`items.${feature.key}.title`),
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{tFeatures('description')}</p>
      <AdminTabs
        tabs={tabs}
        value={featureKey}
        onChange={setFeatureKey}
        ariaLabel={t('tabs.visibility')}
        size="sm"
      />
      <div role="tabpanel" aria-labelledby={`admin-tab-${featureKey}`} className="space-y-5">
        <FeatureSettings initialFlags={initialFlags} featureKey={featureKey} hideHeader />
        {DISPLAY_SECTIONS.map((section) => (
          <div key={section} hidden={featureKey !== section} className="space-y-5">
            <DisplayModeSettingsPanel
              initialSettings={initialDisplayModeSettings}
              section={section}
              hideHeader
            />
            <ItemTypeSettingsPanel
              initialCatalog={initialItemTypes}
              section={section}
              hideHeader
            />
          </div>
        ))}
      </div>
    </div>
  );
}
