'use client';

import { FeatureGate } from '@/features/access';
import type { UserProfile } from '@/entities/user';
import { useTranslations } from 'next-intl';

interface ProfileViewProps {
  profile: UserProfile;
}

export function ProfileView({ profile }: ProfileViewProps) {
  const t = useTranslations('profile');

  return (
    <FeatureGate
      feature="profile"
      fallback={
        <div className="rounded-xl border border-border p-8 text-center">
          <h1 className="text-xl font-semibold">{t('authRequiredTitle')}</h1>
          <p className="text-muted-foreground mt-2">{t('authRequiredDescription')}</p>
        </div>
      }
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>

        <div className="rounded-xl border border-border p-6 flex items-center gap-4">
          {profile.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.image}
              alt={profile.name ?? profile.email}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary">
              {(profile.name ?? profile.email).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-xl font-semibold">{profile.name ?? t('unnamed')}</div>
            <div className="text-muted-foreground">{profile.email}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {t('role')}: {t(`roles.${profile.role}`)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border p-6 space-y-3">
          <h2 className="font-semibold">{t('storageTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('storageDescription')}</p>
        </div>
      </div>
    </FeatureGate>
  );
}
