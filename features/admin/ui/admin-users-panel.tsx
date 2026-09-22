'use client';

import { useAccess } from '@/features/access';
import { useTranslations } from 'next-intl';

interface AdminUsersPanelProps {
  hideHeader?: boolean;
}

export function AdminUsersPanel({ hideHeader = false }: AdminUsersPanelProps) {
  const { canAccessFeature } = useAccess();
  const t = useTranslations('admin.users');

  if (!canAccessFeature('admin_manage_admins')) {
    return null;
  }

  return (
    <section className="space-y-3">
      {!hideHeader && (
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
      )}

      {hideHeader && <p className="text-sm text-muted-foreground">{t('description')}</p>}

      <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        {t('placeholder')}
      </div>
    </section>
  );
}
