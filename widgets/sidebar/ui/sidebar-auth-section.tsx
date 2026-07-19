'use client';

import { useAccess } from '@/features/access';
import { SignInButton, SignOutButton } from '@/features/auth';
import { Link } from '@/i18n/routing';
import { AlertCircle, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function SidebarAuthSection() {
  const { profile, canAccessFeature } = useAccess();
  const t = useTranslations('sidebar');

  return (
    <div className="px-6 py-4 space-y-3 border-t border-border">
      {profile.role === 'GUEST' ? (
        <>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{t('guestStorageHint')}</span>
          </p>
          <SignInButton />
        </>
      ) : (
        <div className="space-y-2">
          {canAccessFeature('profile') && (
            <Link
              href="/profile"
              className="block rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              {t('profile')}
            </Link>
          )}
          {canAccessFeature('admin_panel') && (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Shield size={16} />
              {t('admin')}
            </Link>
          )}
          <SignOutButton />
        </div>
      )}
    </div>
  );
}
