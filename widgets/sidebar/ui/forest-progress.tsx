'use client';

import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

export function ForestProgress() {
  const t = useTranslations('sidebar');
  const hydrated = useStoreHydrated();
  const goals = useStore((state) => state.goals);
  const total = goals.length;
  const growing = goals.filter((goal) => goal.progress > 0).length;
  const average = total
    ? Math.round(goals.reduce((sum, goal) => sum + (Number(goal.progress) || 0), 0) / total)
    : 0;

  if (!hydrated) {
    return <div className="h-[4.5rem] animate-pulse rounded-xl bg-accent/50" aria-hidden />;
  }

  return (
    <div className="rounded-xl border border-border/80 bg-background/70 px-3 py-2.5">
      <p className="text-xs font-medium leading-snug text-foreground">{t('forestTitle')}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {total === 0 ? t('forestEmpty') : t('forestCount', { grown: growing, total })}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15" aria-hidden>
        <div
          className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `${average}%` }}
        />
      </div>
    </div>
  );
}
