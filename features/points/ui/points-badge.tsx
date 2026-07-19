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
}

export function PointsBadge({ className, compact = false }: PointsBadgeProps) {
  const balance = useStore((state) => state.balance);
  const { canAccessFeature } = useAccess();
  const t = useTranslations('points');

  if (!canAccessFeature('gamification')) return null;

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
