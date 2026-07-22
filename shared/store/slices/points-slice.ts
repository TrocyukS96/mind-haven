import type { PointEvent, PointTransaction } from '@/entities/points/model/types';
import { computeRatingFromTasks } from '@/entities/points/lib/calculate-points';
import { notifyPointsEarned, notifyRewardUnlocked } from '@/features/points/lib/show-points-toast';
import { DEFAULT_PLATFORM_REWARDS } from '@/entities/reward/lib/default-rewards';
import type { CreatePersonalRewardInput, Reward } from '@/entities/reward/model/types';
import type { Task } from '@/entities/task/model/types';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

const MAX_TRANSACTIONS = 100;

export interface PointsSlice {
  balance: number;
  lifetime: number;
  rating: number;
  transactions: PointTransaction[];
  rewards: Reward[];
  pendingRewardIds: string[];

  earnPoints: (event: PointEvent) => number;
  claimReward: (rewardId: string) => boolean;
  addPersonalReward: (input: CreatePersonalRewardInput) => void;
  deletePersonalReward: (rewardId: string) => void;
  dismissRewardNotification: (rewardId: string) => void;
  recalculateRating: (tasks: Task[]) => void;
  getRecentTransactions: (limit?: number) => PointTransaction[];
  getAvailableRewards: () => Reward[];
}

function createTransaction(event: PointEvent): PointTransaction {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amount: event.amount,
    reason: event.reason,
    sourceId: event.sourceId,
    idempotencyKey: event.idempotencyKey,
    createdAt: new Date().toISOString(),
    description: event.description,
  };
}

function checkUnlockedRewards(
  rewards: Reward[],
  balance: number,
  pendingRewardIds: string[]
): string[] {
  const newlyUnlocked: string[] = [];

  for (const reward of rewards) {
    if (reward.claimedAt) continue;
    if (balance < reward.cost) continue;
    if (pendingRewardIds.includes(reward.id)) continue;
    newlyUnlocked.push(reward.id);
  }

  return newlyUnlocked;
}

export const createPointsSlice: StateCreator<AppStore, [], [], PointsSlice> = (set, get) => ({
  balance: 0,
  lifetime: 0,
  rating: 100,
  transactions: [],
  rewards: DEFAULT_PLATFORM_REWARDS,
  pendingRewardIds: [],

  earnPoints: (event) => {
    if (event.amount === 0) return 0;

    const { transactions } = get();
    if (transactions.some((item) => item.idempotencyKey === event.idempotencyKey)) {
      return 0;
    }

    const transaction = createTransaction(event);
    const nextBalance = get().balance + event.amount;
    const nextLifetime = get().lifetime + Math.max(0, event.amount);
    const nextTransactions = [transaction, ...transactions].slice(0, MAX_TRANSACTIONS);
    const newlyUnlocked = checkUnlockedRewards(get().rewards, nextBalance, get().pendingRewardIds);

    set({
      balance: nextBalance,
      lifetime: nextLifetime,
      transactions: nextTransactions,
      pendingRewardIds: [...get().pendingRewardIds, ...newlyUnlocked],
    });

    newlyUnlocked.forEach((rewardId) => notifyRewardUnlocked(rewardId));

    return event.amount;
  },

  claimReward: (rewardId) => {
    const reward = get().rewards.find((item) => item.id === rewardId);
    if (!reward || reward.claimedAt) return false;
    if (get().balance < reward.cost) return false;

    const claimEvent: PointEvent = {
      reason: 'reward_claimed',
      amount: -reward.cost,
      sourceId: rewardId,
      idempotencyKey: `reward:${rewardId}:claimed`,
    };

    if (get().transactions.some((item) => item.idempotencyKey === claimEvent.idempotencyKey)) {
      return false;
    }

    const transaction = createTransaction(claimEvent);
    const nextBalance = get().balance - reward.cost;

    set({
      balance: nextBalance,
      transactions: [transaction, ...get().transactions].slice(0, MAX_TRANSACTIONS),
      rewards: get().rewards.map((item) =>
        item.id === rewardId ? { ...item, claimedAt: new Date().toISOString() } : item
      ),
      pendingRewardIds: get().pendingRewardIds.filter((id) => id !== rewardId),
    });

    notifyPointsEarned(claimEvent.amount, claimEvent.reason);

    return true;
  },

  addPersonalReward: (input) => {
    const reward: Reward = {
      id: `personal-${Date.now()}`,
      type: 'personal',
      title: input.title.trim(),
      description: input.description?.trim(),
      cost: Math.max(1, input.cost),
      icon: input.icon ?? 'star',
      createdAt: new Date().toISOString(),
    };

    set({ rewards: [...get().rewards, reward] });

    const newlyUnlocked = checkUnlockedRewards(
      get().rewards,
      get().balance,
      get().pendingRewardIds
    ).filter((id) => id === reward.id);

    if (newlyUnlocked.length > 0) {
      set({ pendingRewardIds: [...get().pendingRewardIds, ...newlyUnlocked] });
      newlyUnlocked.forEach((rewardId) => notifyRewardUnlocked(rewardId));
    }
  },

  deletePersonalReward: (rewardId) => {
    set({
      rewards: get().rewards.filter(
        (item) => !(item.id === rewardId && item.type === 'personal')
      ),
      pendingRewardIds: get().pendingRewardIds.filter((id) => id !== rewardId),
    });
  },

  dismissRewardNotification: (rewardId) => {
    set({
      pendingRewardIds: get().pendingRewardIds.filter((id) => id !== rewardId),
    });
  },

  recalculateRating: (tasks) => {
    const nextRating = computeRatingFromTasks(tasks);
    if (get().rating !== nextRating) {
      set({ rating: nextRating });
    }
  },

  getRecentTransactions: (limit = 5) => get().transactions.slice(0, limit),

  getAvailableRewards: () =>
    get().rewards.filter((reward) => !reward.claimedAt),
});
