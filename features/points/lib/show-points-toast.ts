import type { PointReason } from '@/entities/points/model/types';
import { toast } from 'react-toastify';

type PointsEarnedListener = (amount: number, reason: PointReason) => void;
type RewardUnlockedListener = (rewardId: string) => void;

let pointsEarnedListener: PointsEarnedListener | null = null;
let rewardUnlockedListener: RewardUnlockedListener | null = null;

export function setPointsEarnedListener(listener: PointsEarnedListener | null) {
  pointsEarnedListener = listener;
}

export function setRewardUnlockedListener(listener: RewardUnlockedListener | null) {
  rewardUnlockedListener = listener;
}

export function notifyPointsEarned(amount: number, reason: PointReason) {
  pointsEarnedListener?.(amount, reason);
}

export function notifyRewardUnlocked(rewardId: string) {
  rewardUnlockedListener?.(rewardId);
}

export function showPointsToast(amount: number, label: string) {
  if (amount === 0) return;

  const prefix = amount > 0 ? '+' : '';
  toast.success(`${prefix}${amount} — ${label}`);
}

export function showRewardUnlockedToast(title: string) {
  toast.info(title, {
    autoClose: 5000,
  });
}
