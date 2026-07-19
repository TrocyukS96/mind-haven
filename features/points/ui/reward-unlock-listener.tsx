'use client';

import {
  setPointsEarnedListener,
  setRewardUnlockedListener,
  showPointsToast,
  showRewardUnlockedToast,
} from '@/features/points/lib/show-points-toast';
import type { PointReason } from '@/entities/points/model/types';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function RewardUnlockListener() {
  const { canAccessFeature } = useAccess();
  const t = useTranslations('points');
  const tRewards = useTranslations('rewards');
  const pendingRewardIds = useStore((state) => state.pendingRewardIds);
  const rewards = useStore((state) => state.rewards);
  const dismissRewardNotification = useStore((state) => state.dismissRewardNotification);
  const [activeRewardId, setActiveRewardId] = useState<string | null>(null);

  const activeReward = activeRewardId
    ? rewards.find((reward) => reward.id === activeRewardId)
    : null;

  const getRewardTitle = (reward: (typeof rewards)[number]) => {
    if (reward.titleKey) {
      return tRewards(reward.titleKey);
    }
    return reward.title;
  };

  useEffect(() => {
    if (!canAccessFeature('gamification')) return;

    setPointsEarnedListener((amount, reason: PointReason) => {
      showPointsToast(amount, t(`reasons.${reason}`));
    });

    setRewardUnlockedListener((rewardId) => {
      const reward = useStore.getState().rewards.find((item) => item.id === rewardId);
      if (!reward) return;

      const title = reward.titleKey ? tRewards(reward.titleKey) : reward.title;
      showRewardUnlockedToast(t('rewardUnlockedToast', { title }));
    });

    return () => {
      setPointsEarnedListener(null);
      setRewardUnlockedListener(null);
    };
  }, [canAccessFeature, t, tRewards]);

  useEffect(() => {
    if (!canAccessFeature('gamification')) return;
    if (activeRewardId) return;
    if (pendingRewardIds.length > 0) {
      setActiveRewardId(pendingRewardIds[0]);
    }
  }, [pendingRewardIds, activeRewardId, canAccessFeature]);

  if (!canAccessFeature('gamification') || !activeReward) return null;

  const handleClose = () => {
    dismissRewardNotification(activeReward.id);
    setActiveRewardId(null);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('rewardUnlockedTitle')}</DialogTitle>
          <DialogDescription>{t('rewardUnlockedDescription')}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border bg-primary/5 p-4">
          <p className="text-lg font-semibold">{getRewardTitle(activeReward)}</p>
          {activeReward.description && (
            <p className="mt-1 text-sm text-muted-foreground">{activeReward.description}</p>
          )}
          {!activeReward.description && activeReward.descriptionKey && (
            <p className="mt-1 text-sm text-muted-foreground">
              {tRewards(activeReward.descriptionKey)}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {t('rewardCost', { cost: activeReward.cost })}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {t('rewardDismiss')}
          </Button>
          <Button asChild onClick={handleClose}>
            <Link href="/rewards">{t('openRewards')}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
