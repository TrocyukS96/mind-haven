import type { XpActivityRule, XpTransactionReason, XpUnit } from '@/entities/ascent/model/types';
import { xpForQuantity } from '@/shared/lib/ascent/xp';
import { isRestrictionLifted } from '@/features/ascent/model/dashboard';

export interface ShopRestrictionRef {
  id: string;
  title: string;
  kind: 'core_behavior' | 'custom';
  rewardId: string | null;
  bypassable: boolean;
  active: boolean;
  unlockAfterSuccessfulDays: number;
}

export interface RewardPermitChoice {
  id: string;
  title: string;
}

export interface RewardOffer {
  status: 'ready' | 'short' | 'core' | 'lifted' | 'unavailable';
  missing: number;
  permits: RewardPermitChoice[];
}

export function rewardOffer(input: {
  reward: { active: boolean; available: boolean; xpCost: number; id: string };
  restrictions: readonly ShopRestrictionRef[];
  currentStreak: number;
  balance: number;
}): RewardOffer {
  const linked = input.restrictions.filter((item) => item.rewardId === input.reward.id);
  if (linked.some((item) => item.kind === 'core_behavior')) {
    return { status: 'core', missing: 0, permits: [] };
  }
  if (!input.reward.active || !input.reward.available) {
    return { status: 'unavailable', missing: 0, permits: [] };
  }

  const permits = linked.filter((item) => item.bypassable && item.kind !== 'core_behavior');
  const open = permits.filter((item) => !isRestrictionLifted(item, input.currentStreak));
  if (permits.length > 0 && open.length === 0) {
    return { status: 'lifted', missing: 0, permits: [] };
  }

  const choices = open.map((item) => ({ id: item.id, title: item.title }));
  const missing = Math.max(0, input.reward.xpCost - input.balance);
  if (missing > 0) return { status: 'short', missing, permits: choices };
  return { status: 'ready', missing: 0, permits: choices };
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Half, the configured volume, and double. Typing a custom amount stays separate. */
export function suggestedQuantities(rule: {
  unit: XpUnit;
  quantityPerGrant: number;
  minQuantity: number;
}): number[] {
  if (rule.unit === 'completion') return [];
  const values: number[] = [];
  for (const raw of [rule.quantityPerGrant / 2, rule.quantityPerGrant, rule.quantityPerGrant * 2]) {
    const rounded = roundQuantity(raw);
    if (rounded <= 0 || rounded < rule.minQuantity || rounded > 1_000_000) continue;
    if (!values.includes(rounded)) values.push(rounded);
  }
  return values;
}

export function previewActivityXp(rule: XpActivityRule, quantity: number): number | null {
  try {
    return xpForQuantity(rule, quantity);
  } catch {
    return null;
  }
}

export type LedgerFilter = 'all' | 'grants' | 'purchases' | 'resets';

export function transactionMatches(reason: XpTransactionReason, filter: LedgerFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'grants') return reason === 'activity_grant' || reason === 'activity_reversal' || reason === 'adjustment';
  if (filter === 'purchases') return reason === 'reward_purchase';
  return reason === 'streak_reset';
}

export function canReverseGrant(input: {
  reason: XpTransactionReason;
  localDate: string | null;
  activityLogId: string | null;
  today: string;
  reversedLogIds: ReadonlySet<string>;
}): boolean {
  if (input.reason !== 'activity_grant' || !input.activityLogId || input.localDate !== input.today) return false;
  return !input.reversedLogIds.has(input.activityLogId);
}

export type OwnedRewardState = 'available' | 'used' | 'owned';

/** Purchasing spends XP. Using a bypass is a second step. There is no expiry column. */
export function ownedRewardState(purchase: { grantsBypass: boolean; permissionUsed: boolean }): OwnedRewardState {
  if (!purchase.grantsBypass) return 'owned';
  return purchase.permissionUsed ? 'used' : 'available';
}
