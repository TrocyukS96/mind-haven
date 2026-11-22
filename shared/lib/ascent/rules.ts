import {
  ASCENT_LIMITS,
  type RestrictionKind,
  type UnwantedBehaviorPreset,
  UNWANTED_BEHAVIOR_PRESETS,
} from '@/entities/ascent/model/types';
import { AscentRuleError } from '@/shared/lib/ascent/errors';

export interface RestrictionDraft {
  title: string;
  description: string;
  kind: RestrictionKind;
  unlockAfterSuccessfulDays: number;
  rewardId: string | null;
  required: boolean;
  bypassable: boolean;
  active: boolean;
  sortOrder: number;
}

export function isUnwantedBehaviorPreset(value: string): value is UnwantedBehaviorPreset {
  return (UNWANTED_BEHAVIOR_PRESETS as readonly string[]).includes(value);
}

export function assertImportance(value: number): number {
  if (!Number.isInteger(value) || value < ASCENT_LIMITS.importanceMin || value > ASCENT_LIMITS.importanceMax) {
    throw new AscentRuleError('invalid_importance');
  }
  return value;
}

export function assertTargetDays(value: number): number {
  if (!Number.isInteger(value) || value < ASCENT_LIMITS.targetDaysMin || value > ASCENT_LIMITS.targetDaysMax) {
    throw new AscentRuleError('invalid_target_days');
  }
  return value;
}

export function assertTitle(value: string): string {
  const title = value.trim();
  if (!title || title.length > ASCENT_LIMITS.titleMax) throw new AscentRuleError('invalid_title');
  return title;
}

export function assertSingleActiveChallenge(activeCount: number): void {
  if (activeCount > 0) throw new AscentRuleError('active_challenge_exists');
}

export function assertHabitOwner(habitUserId: string, challengeUserId: string): void {
  if (!habitUserId || habitUserId !== challengeUserId) {
    throw new AscentRuleError('habit_owner_mismatch');
  }
}

export function assertRestrictionDraft(draft: RestrictionDraft): void {
  if (!Number.isInteger(draft.unlockAfterSuccessfulDays) || draft.unlockAfterSuccessfulDays < 0) {
    throw new AscentRuleError('invalid_restriction');
  }

  if (draft.kind === 'core_behavior') {
    if (draft.bypassable || draft.rewardId) {
      throw new AscentRuleError('core_behavior_not_bypassable');
    }
    return;
  }

  if (draft.bypassable && !draft.rewardId) throw new AscentRuleError('bypass_requires_reward');
  if (!draft.bypassable && draft.rewardId) throw new AscentRuleError('reward_link_requires_bypass');
}

export function coreBehaviorRestriction(title: string): RestrictionDraft {
  return {
    title: assertTitle(title),
    description: '',
    kind: 'core_behavior',
    unlockAfterSuccessfulDays: 0,
    rewardId: null,
    required: true,
    bypassable: false,
    active: true,
    sortOrder: 0,
  };
}

export function assertHasCoreRestriction(
  restrictions: readonly Pick<RestrictionDraft, 'kind' | 'required' | 'active'>[]
): void {
  const present = restrictions.some(
    (item) => item.kind === 'core_behavior' && item.required && item.active
  );
  if (!present) throw new AscentRuleError('core_behavior_required');
}

export function assertRewardBypassesRestriction(
  restriction: Pick<RestrictionDraft, 'kind' | 'bypassable' | 'rewardId'>,
  rewardId: string
): void {
  if (restriction.kind === 'core_behavior' || !restriction.bypassable) {
    throw new AscentRuleError('core_behavior_not_bypassable');
  }
  if (!restriction.rewardId || restriction.rewardId !== rewardId) {
    throw new AscentRuleError('reward_link_requires_bypass');
  }
}

export interface RewardPermission {
  grantsBypass: boolean;
  permissionUsed: boolean;
  usedOnLocalDate: string | null;
}

/** Marks a purchased bypass as used for one local date. The same purchase cannot cover a second date. */
export function useRewardPermission(
  purchase: RewardPermission,
  localDate: string
): RewardPermission & { replayed: boolean } {
  if (!purchase.grantsBypass) throw new AscentRuleError('not_a_permit');

  if (purchase.permissionUsed) {
    if (purchase.usedOnLocalDate === localDate) {
      return { ...purchase, replayed: true };
    }
    throw new AscentRuleError('permission_already_used');
  }

  return {
    grantsBypass: true,
    permissionUsed: true,
    usedOnLocalDate: localDate,
    replayed: false,
  };
}
