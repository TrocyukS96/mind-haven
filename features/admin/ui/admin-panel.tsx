'use client';

import { FeatureGate } from '@/features/access';
import type { FeatureKey } from '@/shared/config/features';
import { FeatureSettings } from './feature-settings';
import { AdminUsersPanel } from './admin-users-panel';
import { useTranslations } from 'next-intl';

interface AdminPanelProps {
  initialFlags: Record<FeatureKey, boolean>;
}

export function AdminPanel({ initialFlags }: AdminPanelProps) {
  const t = useTranslations('admin');

  return (
    <FeatureGate
      feature="admin_panel"
      fallback={
        <div className="rounded-xl border border-border p-8 text-center">
          <h1 className="text-xl font-semibold">{t('accessDeniedTitle')}</h1>
          <p className="text-muted-foreground mt-2">{t('accessDeniedDescription')}</p>
        </div>
      }
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>

        <FeatureGate feature="admin_feature_settings">
          <FeatureSettings initialFlags={initialFlags} />
        </FeatureGate>

        <AdminUsersPanel />
      </div>
    </FeatureGate>
  );
}
