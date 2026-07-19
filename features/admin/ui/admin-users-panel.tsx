'use client';

import { useAccess } from '@/features/access';
import { useTranslations } from 'next-intl';

export function AdminUsersPanel() {
  const { canAccessFeature } = useAccess();
  const t = useTranslations('admin.users');

  if (!canAccessFeature('admin_manage_admins')) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        {t('placeholder')}
      </div>
    </section>
  );
}
