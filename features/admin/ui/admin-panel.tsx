'use client';

import { FeatureGate, useAccess } from '@/features/access';
import type { AdminUserListItem } from '@/entities/user';
import type { FeatureKey } from '@/shared/config/features';
import type { DisplayModeSettings } from '@/shared/config/display-modes';
import type { ItemTypeCatalog } from '@/shared/config/item-types';
import type { ReflectionQuestionCatalog } from '@/shared/config/reflection-questions';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AdminTabs } from './admin-tabs';
import { AdminUsersPanel } from './admin-users-panel';
import { FeatureVisibilityPanel } from './feature-visibility-panel';
import { ReflectionQuestionSettingsPanel } from './reflection-question-settings';
import { UsersPanel } from './users-panel';

interface AdminPanelProps {
  initialFlags: Record<FeatureKey, boolean>;
  initialDisplayModeSettings: DisplayModeSettings;
  initialItemTypes: ItemTypeCatalog;
  initialReflectionQuestions: ReflectionQuestionCatalog;
  initialUsers: AdminUserListItem[];
}

type MainTab = 'visibility' | 'reflection' | 'users' | 'admins';

export function AdminPanel({
  initialFlags,
  initialDisplayModeSettings,
  initialItemTypes,
  initialReflectionQuestions,
  initialUsers,
}: AdminPanelProps) {
  const t = useTranslations('admin');
  const { canAccessFeature } = useAccess();
  const canManageFeatures = canAccessFeature('admin_feature_settings');
  const canManageAdmins = canAccessFeature('admin_manage_admins');

  const tabs = useMemo(
    () =>
      [
        canManageFeatures && { value: 'visibility' as const, label: t('tabs.visibility') },
        canManageFeatures && { value: 'reflection' as const, label: t('tabs.reflection') },
        { value: 'users' as const, label: t('tabs.users') },
        canManageAdmins && { value: 'admins' as const, label: t('tabs.admins') },
      ].filter((tab): tab is { value: MainTab; label: string } => Boolean(tab)),
    [canManageAdmins, canManageFeatures, t]
  );

  const [tab, setTab] = useState<MainTab>(tabs[0]?.value ?? 'visibility');
  const activeTab = tabs.some((item) => item.value === tab) ? tab : tabs[0]?.value;

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
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
        </div>

        {tabs.length > 0 && activeTab && (
          <AdminTabs tabs={tabs} value={activeTab} onChange={setTab} ariaLabel={t('title')} />
        )}

        {activeTab === 'visibility' && canManageFeatures && (
          <div role="tabpanel" aria-labelledby="admin-tab-visibility">
            <FeatureVisibilityPanel
              initialFlags={initialFlags}
              initialDisplayModeSettings={initialDisplayModeSettings}
              initialItemTypes={initialItemTypes}
            />
          </div>
        )}

        {activeTab === 'reflection' && canManageFeatures && (
          <div role="tabpanel" aria-labelledby="admin-tab-reflection">
            <ReflectionQuestionSettingsPanel
              initialCatalog={initialReflectionQuestions}
              hideHeader
            />
          </div>
        )}

        {activeTab === 'users' && (
          <div role="tabpanel" aria-labelledby="admin-tab-users">
            <UsersPanel initialUsers={initialUsers} />
          </div>
        )}

        {activeTab === 'admins' && (
          <div role="tabpanel" aria-labelledby="admin-tab-admins">
            <AdminUsersPanel hideHeader />
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
