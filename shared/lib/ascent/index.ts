export { ASCENT_API_CONTRACT, type AscentEndpoint } from '@/shared/lib/ascent/api-contract';
export { evaluateDay, missedDayEvaluation } from '@/shared/lib/ascent/day-result';
export type {
  CustomObligationInput,
  DayEvaluation,
  DebtItemResult,
  HabitObligationInput,
  RestrictionObligationInput,
} from '@/shared/lib/ascent/day-result';
export { AscentRuleError, isAscentRuleError } from '@/shared/lib/ascent/errors';
export type { AscentErrorCode } from '@/shared/lib/ascent/errors';
export { habitObligationForDate } from '@/shared/lib/ascent/habit-obligation';
export { ascentKey } from '@/shared/lib/ascent/keys';
export {
  assertIsoDate,
  assertTimeZone,
  assertTimezoneUnchanged,
  eachLocalDate,
  formatLocalDate,
  formatLocalTime,
  instantOnLocalDate,
  localDateTime,
  resolveAbstinenceStartedAt,
  resolveChallengeStartsAt,
  shiftIsoDate,
  startOfLocalDay,
} from '@/shared/lib/ascent/local-date';
export {
  assertHabitOwner,
  assertHasCoreRestriction,
  assertImportance,
  assertRestrictionDraft,
  assertRewardBypassesRestriction,
  assertSingleActiveChallenge,
  assertTargetDays,
  assertTitle,
  coreBehaviorRestriction,
  isUnwantedBehaviorPreset,
  useRewardPermission,
} from '@/shared/lib/ascent/rules';
export type { RestrictionDraft, RewardPermission } from '@/shared/lib/ascent/rules';
export { buildAbstinenceClock, canEditAbstinenceStart, optionalAbstinenceStart } from '@/shared/lib/ascent/abstinence';
export type { AscentClock } from '@/shared/lib/ascent/abstinence';
export { pauseChallenge, resumeChallenge, settleElapsedDays } from '@/shared/lib/ascent/settlement';
export type { PauseWindow, SettledDay, SettlementResult } from '@/shared/lib/ascent/settlement';
export {
  assertActivityDateOpen,
  purchaseReward,
  registerActivity,
  reverseActivityXp,
  xpForQuantity,
} from '@/shared/lib/ascent/xp';
export type { ActivityGrantResult, PurchaseResult, ReversalResult } from '@/shared/lib/ascent/xp';
