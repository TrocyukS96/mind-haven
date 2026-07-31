'use client';

import { useAccess } from '@/features/access';
import { Link } from '@/i18n/routing';
import { useStore } from '@/shared/store/store-config';
import { cn } from '@/shared/lib/utils';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PointsBadgeProps {
  className?: string;
  compact?: boolean;
  variant?: 'default' | 'header';
}

export function PointsBadge({
  className,
  compact = false,
  variant = 'default',
}: PointsBadgeProps) {
  const balance = useStore((state) => state.balance);
  const { canAccessFeature } = useAccess();
  const t = useTranslations('points');
  const isHeader = variant === 'header';

  if (!canAccessFeature('gamification')) return null;

  if (isHeader) {
    return (
      <Link
        href="/rewards"
        title={t('openRewards')}
        aria-label={t('openRewards')}
        className={cn(
          'group inline-flex shrink-0 items-center',
          'transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]',
          className
        )}
      >
        <span
          className={cn(
            'voice-accent-pill voice-accent-pill--header relative flex items-center overflow-hidden',
            'gap-2 rounded-xl px-2.5 py-1.5',
            'lg:gap-2.5 lg:rounded-full lg:py-1 lg:pl-1 lg:pr-3 xl:pr-4'
          )}
        >
          <span className="voice-accent-icon flex size-8 shrink-0 items-center justify-center rounded-lg lg:size-10 lg:rounded-full">
            <Star size={16} className="shrink-0 fill-current/25 lg:size-[1.125rem]" />
          </span>

          <span className="whitespace-nowrap text-xs font-medium text-foreground tabular-nums lg:hidden">
            {balance}
          </span>

          <span className="hidden whitespace-nowrap text-sm font-medium text-foreground lg:inline">
            <span className="tabular-nums">{balance}</span>{' '}
            <span className="text-muted-foreground">{t('pointsShort')}</span>
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/rewards"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10',
        'px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15',
        className
      )}
      title={t('openRewards')}
    >
      <Star size={14} className="shrink-0 fill-primary/30" />
      <span>{balance}</span>
      {!compact && <span className="hidden sm:inline">{t('pointsShort')}</span>}
    </Link>
  );
}
