'use client';

import { SignInButton } from '@/features/auth';
import { AscentSettings } from '@/features/ascent/ui/ascent-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useTranslations } from 'next-intl';

export function AscentSettingsPage({ authenticated }: { authenticated: boolean }) {
  const t = useTranslations('ascent');
  if (!authenticated) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>{t('signInTitle')}</CardTitle>
            <CardDescription>{t('signInBody')}</CardDescription>
          </CardHeader>
          <CardContent>
            <SignInButton />
          </CardContent>
        </Card>
      </div>
    );
  }
  return <AscentSettings />;
}
