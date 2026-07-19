'use client';

import {
  FEATURES,
  getFeatureListByCategory,
  type FeatureKey,
} from '@/shared/config/features';
import { Checkbox } from '@/shared/ui/checkbox';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface FeatureSettingsProps {
  initialFlags: Record<FeatureKey, boolean>;
}

export function FeatureSettings({ initialFlags }: FeatureSettingsProps) {
  const t = useTranslations('admin.features');
  const [flags, setFlags] = useState(initialFlags);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggleableFeatures = [
    ...getFeatureListByCategory('core'),
    ...getFeatureListByCategory('premium'),
  ].filter((feature) => feature.adminToggleable);

  const handleToggle = async (key: FeatureKey, enabled: boolean) => {
    const nextFlags = { ...flags, [key]: enabled };
    setFlags(nextFlags);
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flags: { [key]: enabled } }),
      });

      if (!response.ok) {
        throw new Error('Failed to update feature flag');
      }

      const data = (await response.json()) as { flags: Record<FeatureKey, boolean> };
      setFlags(data.flags);
      setMessage(t('saved'));
    } catch {
      setFlags(flags);
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
        {toggleableFeatures.map((feature) => (
          <label
            key={feature.key}
            className="flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/40"
          >
            <Checkbox
              checked={flags[feature.key]}
              disabled={isSaving}
              onCheckedChange={(checked) =>
                handleToggle(feature.key, checked === true)
              }
            />
            <div className="space-y-1">
              <div className="font-medium">{t(`items.${feature.key}.title`)}</div>
              <div className="text-sm text-muted-foreground">
                {t(`items.${feature.key}.description`)}
              </div>
              {feature.requiresSubscription && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  {t('premiumBadge')}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
