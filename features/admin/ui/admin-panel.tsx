'use client';

import { FeatureGate } from '@/features/access';
import type { FeatureKey } from '@/shared/config/features';
import type { DisplayModeSettings } from '@/shared/config/display-modes';
import type { ItemTypeCatalog } from '@/shared/config/item-types';
import type { ReflectionQuestionCatalog } from '@/shared/config/reflection-questions';
import { FeatureSettings } from './feature-settings';
import { DisplayModeSettingsPanel } from './display-mode-settings';
import { ItemTypeSettingsPanel } from './item-type-settings';
import { ReflectionQuestionSettingsPanel } from './reflection-question-settings';
import { AdminUsersPanel } from './admin-users-panel';
import { useTranslations } from 'next-intl';

interface AdminPanelProps {
  initialFlags: Record<FeatureKey, boolean>;
  initialDisplayModeSettings: DisplayModeSettings;
  initialItemTypes: ItemTypeCatalog;
  initialReflectionQuestions: ReflectionQuestionCatalog;
}

export function AdminPanel({
  initialFlags,
  initialDisplayModeSettings,
  initialItemTypes,
  initialReflectionQuestions,
}: AdminPanelProps) {
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
          <div className="pt-8">
            <DisplayModeSettingsPanel initialSettings={initialDisplayModeSettings} />
          </div>
          <div className="pt-8">
            <ItemTypeSettingsPanel initialCatalog={initialItemTypes} />
          </div>
          <div className="pt-8">
            <ReflectionQuestionSettingsPanel initialCatalog={initialReflectionQuestions} />
          </div>
        </FeatureGate>

        <AdminUsersPanel />
      </div>
    </FeatureGate>
  );
}
