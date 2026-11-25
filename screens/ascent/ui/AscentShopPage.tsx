'use client';

import { SignInButton } from '@/features/auth';
import { AscentShop } from '@/features/ascent/ui/ascent-shop';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useTranslations } from 'next-intl';

export function AscentShopPage({ authenticated }: { authenticated: boolean }) {
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
  return <AscentShop />;
}
