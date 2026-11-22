import { describe, expect, it } from 'vitest';
import type { XpActivityRule } from '@/entities/ascent/model/types';
import {
  canReverseGrant,
  ownedRewardState,
  previewActivityXp,
  rewardOffer,
  suggestedQuantities,
  transactionMatches,
  type ShopRestrictionRef,
} from '@/features/ascent/model/shop';

const run: XpActivityRule = {
  unit: 'kilometers',
  xpPerGrant: 70,
  quantityPerGrant: 3,
  minQuantity: 1,
  active: true,
};

function restriction(patch: Partial<ShopRestrictionRef> = {}): ShopRestrictionRef {
  return {
    id: 'limit-1',
    title: 'Без кофе',
    kind: 'custom',
    rewardId: 'coffee',
    bypassable: true,
    active: true,
    unlockAfterSuccessfulDays: 3,
    ...patch,
  };
}

describe('reward shop offers', () => {
  it('sells a reward when the balance covers it and blocks the core behavior', () => {
    expect(
      rewardOffer({
        reward: { id: 'anime', active: true, available: true, xpCost: 90 },
        restrictions: [],
        currentStreak: 0,
        balance: 100,
      }).status
    ).toBe('ready');

    expect(
      rewardOffer({
        reward: { id: 'core-reward', active: true, available: true, xpCost: 1 },
        restrictions: [restriction({ id: 'core', kind: 'core_behavior', rewardId: 'core-reward', bypassable: false, title: 'Курение' })],
        currentStreak: 10,
        balance: 100,
      }).status
    ).toBe('core');
  });

  it('shows the shortfall and hides a permission whose restriction is already lifted', () => {
    const short = rewardOffer({
      reward: { id: 'coffee', active: true, available: true, xpCost: 70 },
      restrictions: [restriction()],
      currentStreak: 0,
      balance: 30,
    });
    expect(short.status).toBe('short');
    expect(short.missing).toBe(40);
    expect(short.permits).toEqual([{ id: 'limit-1', title: 'Без кофе' }]);

    expect(
      rewardOffer({
        reward: { id: 'coffee', active: true, available: true, xpCost: 70 },
        restrictions: [restriction()],
        currentStreak: 3,
        balance: 100,
      }).status
    ).toBe('lifted');
  });

  it('keeps a second open permission when another linked limit is already lifted', () => {
    const offer = rewardOffer({
      reward: { id: 'coffee', active: true, available: true, xpCost: 70 },
      restrictions: [
        restriction({ id: 'lifted', unlockAfterSuccessfulDays: 1 }),
        restriction({ id: 'open', title: 'Без сладкого', unlockAfterSuccessfulDays: 5 }),
      ],
      currentStreak: 2,
      balance: 70,
    });
    expect(offer.status).toBe('ready');
    expect(offer.permits.map((item) => item.id)).toEqual(['open']);
  });
});

describe('XP earning preview', () => {
  it('suggests half, the configured distance, and double without granting XP', () => {
    expect(suggestedQuantities(run)).toEqual([1.5, 3, 6]);
    expect(previewActivityXp(run, 1.5)).toBe(35);
    expect(previewActivityXp(run, 3)).toBe(70);
    expect(previewActivityXp(run, 0.5)).toBe(0);
    expect(suggestedQuantities({ ...run, unit: 'completion' })).toEqual([]);
  });

  it('filters the ledger and allows undoing only an open grant', () => {
    expect(transactionMatches('activity_grant', 'grants')).toBe(true);
    expect(transactionMatches('activity_reversal', 'grants')).toBe(true);
    expect(transactionMatches('reward_purchase', 'purchases')).toBe(true);
    expect(transactionMatches('streak_reset', 'resets')).toBe(true);
    expect(transactionMatches('streak_reset', 'grants')).toBe(false);

    const reversed = new Set(['log-1']);
    expect(
      canReverseGrant({
        reason: 'activity_grant',
        localDate: '2026-11-22',
        activityLogId: 'log-2',
        today: '2026-11-22',
        reversedLogIds: reversed,
      })
    ).toBe(true);
    expect(
      canReverseGrant({
        reason: 'activity_grant',
        localDate: '2026-11-21',
        activityLogId: 'log-2',
        today: '2026-11-22',
        reversedLogIds: reversed,
      })
    ).toBe(false);
    expect(
      canReverseGrant({
        reason: 'streak_reset',
        localDate: '2026-11-22',
        activityLogId: null,
        today: '2026-11-22',
        reversedLogIds: reversed,
      })
    ).toBe(false);
  });

  it('separates buying a reward from using a one-time permission', () => {
    expect(ownedRewardState({ grantsBypass: true, permissionUsed: false })).toBe('available');
    expect(ownedRewardState({ grantsBypass: true, permissionUsed: true })).toBe('used');
    expect(ownedRewardState({ grantsBypass: false, permissionUsed: false })).toBe('owned');
  });
});
