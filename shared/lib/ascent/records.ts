import type {
  ChallengeDayStatus,
  ChallengeStatus,
  DebtItemState,
  DebtSource,
  RestrictionKind,
  XpTransactionReason,
  XpUnit,
} from '@/entities/ascent/model/types';

export interface ChallengeRecord {
  id: string;
  userId: string;
  title: string;
  description: string;
  unwantedBehavior: string;
  behaviorPreset: string | null;
  yearsStruggling: number | null;
  importance: number;
  targetDays: number;
  startsAt: Date;
  abstinenceStartedAt: Date;
  status: ChallengeStatus;
  currentStreak: number;
  bestStreak: number;
  timezone: string;
  xpBalance: number;
  xpEarnedTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RewardRecord {
  id: string;
  userId: string;
  challengeId: string;
  title: string;
  description: string;
  icon: string | null;
  xpCost: number;
  active: boolean;
  available: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerRecord {
  id: string;
  userId: string;
  challengeId: string;
  title: string;
  description: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitRecord {
  id: string;
  userId: string;
  name: string;
  frequency: string;
  streak: number;
  completedDays: string[];
  trackingType: string;
  targetCount: number | null;
  dayCounts: Record<string, number>;
}

export interface HabitLinkRecord {
  id: string;
  userId: string;
  challengeId: string;
  habitId: string;
  required: boolean;
  sortOrder: number;
  completionRule: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestrictionRecord {
  id: string;
  userId: string;
  challengeId: string;
  title: string;
  description: string;
  kind: RestrictionKind;
  unlockAfterSuccessfulDays: number;
  rewardId: string | null;
  required: boolean;
  bypassable: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomDebtRecord {
  id: string;
  userId: string;
  challengeId: string;
  title: string;
  description: string;
  required: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityRecord {
  id: string;
  userId: string;
  challengeId: string;
  title: string;
  actionType: string;
  unit: XpUnit;
  xpPerGrant: number;
  quantityPerGrant: number;
  minQuantity: number;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLogRecord {
  id: string;
  userId: string;
  challengeId: string;
  activityId: string;
  localDate: string;
  quantity: number;
  xpGranted: number;
  idempotencyKey: string;
  reversedAt: Date | null;
  createdAt: Date;
}

export interface PurchaseRecord {
  id: string;
  userId: string;
  challengeId: string;
  rewardId: string;
  restrictionId: string | null;
  xpSpent: number;
  grantsBypass: boolean;
  permissionUsed: boolean;
  permissionUsedAt: Date | null;
  usedOnLocalDate: string | null;
  idempotencyKey: string;
  purchasedAt: Date;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  challengeId: string;
  amount: number;
  lifetimeDelta: number;
  reason: XpTransactionReason;
  balanceAfter: number;
  earnedTotalAfter: number;
  idempotencyKey: string;
  localDate: string | null;
  sourceId: string | null;
  activityLogId: string | null;
  purchaseId: string | null;
  note: string;
  createdAt: Date;
}

export interface DayRecord {
  id: string;
  userId: string;
  challengeId: string;
  localDate: string;
  status: ChallengeDayStatus;
  obligationsMet: boolean;
  debtClosed: boolean;
  failureReason: string | null;
  settledAt: Date | null;
  streakAfter: number | null;
  bestStreakAfter: number | null;
  xpBalanceAfter: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtItemRecord {
  id: string;
  userId: string;
  challengeId: string;
  localDate: string;
  source: DebtSource;
  sourceId: string;
  title: string;
  required: boolean;
  state: DebtItemState;
  confirmedByUser: boolean;
  confirmedAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengePatch {
  title?: string;
  description?: string;
  unwantedBehavior?: string;
  behaviorPreset?: string | null;
  yearsStruggling?: number | null;
  importance?: number;
  abstinenceStartedAt?: Date;
  status?: ChallengeStatus;
  currentStreak?: number;
  bestStreak?: number;
  xpBalance?: number;
  xpEarnedTotal?: number;
}

export interface NewChallenge {
  userId: string;
  title: string;
  description: string;
  unwantedBehavior: string;
  behaviorPreset: string | null;
  yearsStruggling: number | null;
  importance: number;
  targetDays: number;
  startsAt: Date;
  abstinenceStartedAt: Date;
  timezone: string;
}
