'use client';

import { SignInButton } from '@/features/auth';
import { AscentHome } from '@/features/ascent/ui/ascent-home';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useTranslations } from 'next-intl';

export function AscentHomePage({ authenticated }: { authenticated: boolean }) {
  const t = useTranslations('ascent');

  if (!authenticated) {
    return (
      <div className="max-w-lg">
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

  return <AscentHome />;
}
