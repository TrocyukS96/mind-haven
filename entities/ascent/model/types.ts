export const CHALLENGE_STATUSES = ['active', 'paused', 'completed', 'archived'] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const CHALLENGE_DAY_STATUSES = ['pending', 'successful', 'failed', 'skipped'] as const;
export type ChallengeDayStatus = (typeof CHALLENGE_DAY_STATUSES)[number];

export const RESTRICTION_KINDS = ['core_behavior', 'custom'] as const;
export type RestrictionKind = (typeof RESTRICTION_KINDS)[number];

export const DEBT_SOURCES = ['habit', 'restriction', 'custom'] as const;
export type DebtSource = (typeof DEBT_SOURCES)[number];

export const DEBT_ITEM_STATES = [
  'pending',
  'satisfied',
  'missed',
  'not_applicable',
  'bypassed',
] as const;
export type DebtItemState = (typeof DEBT_ITEM_STATES)[number];

export const XP_UNITS = ['repetitions', 'minutes', 'kilometers', 'completion'] as const;
export type XpUnit = (typeof XP_UNITS)[number];

export const XP_TRANSACTION_REASONS = [
  'activity_grant',
  'reward_purchase',
  'streak_reset',
  'activity_reversal',
  'adjustment',
] as const;
export type XpTransactionReason = (typeof XP_TRANSACTION_REASONS)[number];

export const COMPLETION_RULES = ['as_habit'] as const;
export type CompletionRule = (typeof COMPLETION_RULES)[number];

export const DAY_FAILURE_REASONS = [
  'habit_unmet',
  'restriction_violated',
  'restriction_unconfirmed',
  'debt_unconfirmed',
  'obligations_unmet',
] as const;
export type DayFailureReason = (typeof DAY_FAILURE_REASONS)[number];

export const UNWANTED_BEHAVIOR_PRESETS = [
  'porn',
  'smoking',
  'overeating',
  'alcohol',
  'social_media',
  'sugar',
] as const;
export type UnwantedBehaviorPreset = (typeof UNWANTED_BEHAVIOR_PRESETS)[number];

export const ASCENT_LIMITS = {
  titleMax: 120,
  descriptionMax: 4000,
  importanceMin: 0,
  importanceMax: 100,
  targetDaysMin: 1,
  targetDaysMax: 3660,
  yearsMax: 100,
  xpPerGrantMax: 100_000,
  singleGrantMax: 100_000,
  quantityMax: 1_000_000,
} as const;

/** Ledger and streak state for one challenge. History lives outside this object. */
export interface AscentState {
  status: ChallengeStatus;
  currentStreak: number;
  bestStreak: number;
  xpBalance: number;
  xpEarnedTotal: number;
  /** Local date the challenge was paused. Whole days after it are not judged. */
  pauseStartedOn: string | null;
  appliedKeys: readonly string[];
}

export interface XpActivityRule {
  unit: XpUnit;
  /** XP granted for `quantityPerGrant` of the unit. Completion ignores extra quantity. */
  xpPerGrant: number;
  /**
   * Volume that earns `xpPerGrant`.
   * Kilometers use up to 3 decimal places (1.5 km), not a done/not-done flag.
   */
  quantityPerGrant: number;
  minQuantity: number;
  active: boolean;
}

export interface XpMutation {
  idempotencyKey: string;
  /** Signed change of the spendable balance. */
  amount: number;
  /** Signed change of lifetime earned XP. Purchases and streak resets leave this at 0. */
  lifetimeDelta: number;
  reason: XpTransactionReason;
  balanceAfter: number;
  earnedTotalAfter: number;
  localDate: string | null;
  sourceId: string | null;
}
