'use client';

import { useAccess } from '@/features/access';
import { Link } from '@/i18n/routing';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Star, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export function PointsDashboardWidget() {
  const { canAccessFeature } = useAccess();
  const t = useTranslations('dashboard');
  const tPoints = useTranslations('points');
  const balance = useStore((state) => state.balance);
  const rating = useStore((state) => state.rating);
  const transactions = useStore((state) => state.transactions);
  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  if (!canAccessFeature('gamification')) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t('pointsBalance')}</CardTitle>
          <Star size={20} className="text-primary" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-3xl font-semibold">{balance}</p>
            <p className="text-sm text-muted-foreground">{tPoints('pointsShort')}</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <TrendingUp size={16} className="text-secondary" />
            <span>{t('pointsRating')}: {rating}/100</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('pointsRecent')}</p>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('pointsEmpty')}</p>
          ) : (
            recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm"
              >
                <span>{tPoints(`reasons.${transaction.reason}`)}</span>
                <span className={transaction.amount > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                </span>
              </div>
            ))
          )}
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link href="/rewards">{t('viewRewards')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
