'use client';

import { getEnergyLevel, getLatestEnergyCheckIn } from '@/entities/energy';
import { useAccess } from '@/features/access';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';
import { cn } from '@/shared/lib/utils';
import { Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface EnergyBadgeProps {
  className?: string;
}

export function EnergyBadge({ className }: EnergyBadgeProps) {
  const { canAccessFeature } = useAccess();
  const hydrated = useStoreHydrated();
  const checkIns = useStore((state) => state.energyCheckIns);
  const openEnergyCheckIn = useStore((state) => state.openEnergyCheckIn);
  const t = useTranslations('energy');
  const latest = hydrated ? getLatestEnergyCheckIn(checkIns) : null;
  const level = latest ? getEnergyLevel(latest.score) : null;

  if (!canAccessFeature('energy')) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={openEnergyCheckIn}
      title={latest ? t('retakeHint') : t('startHint')}
      aria-label={latest ? t('retakeHint') : t('startHint')}
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
          <Zap size={16} className="shrink-0 fill-current/25 lg:size-[1.125rem]" />
        </span>

        {latest ? (
          <>
            <span className="whitespace-nowrap text-xs font-medium text-foreground tabular-nums lg:hidden">
              {latest.score.toFixed(1)}
            </span>
            <span className="hidden min-w-0 lg:flex lg:flex-col lg:items-start">
              <span className="text-sm font-medium leading-tight text-foreground">
                <span className="tabular-nums">{latest.score.toFixed(1)}</span>
                <span className="text-muted-foreground"> / 10</span>
              </span>
              <span className="text-[11px] leading-tight text-muted-foreground">
                {t(`levels.${level}`)}
              </span>
            </span>
          </>
        ) : (
          <span className="whitespace-nowrap text-xs font-medium text-foreground lg:text-sm">
            {t('checkIn')}
          </span>
        )}
      </span>
    </button>
  );
}
