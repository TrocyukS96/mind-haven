'use client';

import type { AscentRestrictionView, AscentRewardView } from '@/features/ascent/api/ascent-home';
import { isRestrictionLifted } from '@/features/ascent/model/dashboard';
import { Link } from '@/i18n/routing';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { useTranslations } from 'next-intl';

export function AscentRestrictions({
  restrictions,
  currentStreak,
}: {
  restrictions: AscentRestrictionView[];
  currentStreak: number;
}) {
  const t = useTranslations('ascent');
  const ordered = [...restrictions].sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
  const lifted = ordered.filter((item) => isRestrictionLifted(item, currentStreak));
  const active = ordered.filter((item) => !isRestrictionLifted(item, currentStreak));

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">{t('home.restrictionsTitle')}</h2>
        {active.length === 0 ? <p className="text-sm text-muted-foreground">{t('home.noActiveRestrictions')}</p> : null}
        <ul className="space-y-3">
          {active.map((item) => (
            <RestrictionRow key={item.id} item={item} />
          ))}
        </ul>
        <details className="rounded-xl border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">{t('home.liftedCount', { count: lifted.length })}</summary>
          {lifted.length === 0 ? (
            <p className="pb-2 pt-3 text-sm text-muted-foreground">{t('home.noLifted')}</p>
          ) : (
            <ul className="space-y-2 pb-2 pt-3">
              {lifted.map((item) => (
                <li key={item.id} className="text-sm text-muted-foreground">
                  {item.title}
                </li>
              ))}
            </ul>
          )}
        </details>
      </CardContent>
    </Card>
  );
}

function RestrictionRow({ item }: { item: AscentRestrictionView }) {
  const t = useTranslations('ascent');
  const canBuy = item.kind !== 'core_behavior' && item.bypassable;
  const line =
    item.kind === 'core_behavior'
      ? t('home.restrictionCore', { title: item.title })
      : item.unlockAfterSuccessfulDays > 0
        ? t('home.restrictionUntil', { title: item.title, count: item.unlockAfterSuccessfulDays })
        : t('home.restrictionOpen', { title: item.title });

  return (
    <li className="rounded-xl border px-3 py-3">
      <p className="text-sm leading-6">{line}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{canBuy ? t('home.canBuy') : t('home.cannotBuy')}</p>
        {canBuy ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/ascent/shop">{t('home.openShop')}</Link>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function AscentXpCard({
  balance,
  earned,
  rewards,
}: {
  balance: number;
  earned: number;
  rewards: AscentRewardView[];
}) {
  const t = useTranslations('ascent');
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <p className="text-sm text-muted-foreground">{t('home.xpBalance', { xp: balance })}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{t('home.xpEarned', { xp: earned })}</p>
        </div>
        <div className="rounded-xl border border-dashed px-3 py-3">
          <h2 className="text-base font-semibold">{t('home.shopTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('home.shopAnnouncement')}</p>
          {rewards.length === 0 ? (
            <p className="mt-3 text-sm">{t('home.shopEmpty')}</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {rewards.map((reward) => (
                <li key={reward.id}>{t('home.rewardCost', { title: reward.title, xp: reward.xpCost })}</li>
              ))}
            </ul>
          )}
          <Button className="mt-4" variant="outline" asChild>
            <Link href="/ascent/shop">{t('home.openShop')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
