import type {
  ActivityLogRecord,
  ActivityRecord,
  ChallengePatch,
  ChallengeRecord,
  CustomDebtRecord,
  DayRecord,
  DebtItemRecord,
  HabitLinkRecord,
  HabitRecord,
  NewChallenge,
  PurchaseRecord,
  RestrictionRecord,
  RewardRecord,
  TransactionRecord,
  TriggerRecord,
} from '@/shared/lib/ascent/records';
import type { DebtItemState, XpTransactionReason, XpUnit } from '@/entities/ascent/model/types';
import type { ChallengeDayStatus } from '@/entities/ascent/model/types';
import type { RestrictionKind } from '@/entities/ascent/model/types';

export type { ChallengePatch, NewChallenge };

export class StoreConflict extends Error {
  readonly constraint: string;

  constructor(constraint: string) {
    super(`Conflict: ${constraint}`);
    this.name = 'StoreConflict';
    this.constraint = constraint;
  }
}

export interface NewReward {
  userId: string;
  challengeId: string;
  title: string;
  description: string;
  icon: string | null;
  xpCost: number;
  active: boolean;
  available: boolean;
  sortOrder: number;
}

export interface RewardPatch {
  title?: string;
  description?: string;
  icon?: string | null;
  xpCost?: number;
  active?: boolean;
  available?: boolean;
  sortOrder?: number;
}

export interface NewTrigger {
  userId: string;
  challengeId: string;
  title: string;
  description: string;
  sortOrder: number;
}

export interface TriggerPatch {
  title?: string;
  description?: string;
  sortOrder?: number;
}

export interface NewHabitLink {
  userId: string;
  challengeId: string;
  habitId: string;
  required: boolean;
  sortOrder: number;
  completionRule: string;
}

export interface NewRestriction {
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
}

export interface RestrictionPatch {
  title?: string;
  description?: string;
  kind?: RestrictionKind;
  unlockAfterSuccessfulDays?: number;
  rewardId?: string | null;
  required?: boolean;
  bypassable?: boolean;
  active?: boolean;
  sortOrder?: number;
}

export interface NewCustomDebt {
  userId: string;
  challengeId: string;
  title: string;
  description: string;
  required: boolean;
  active: boolean;
  sortOrder: number;
}

export interface CustomDebtPatch {
  title?: string;
  description?: string;
  required?: boolean;
  active?: boolean;
  sortOrder?: number;
}

export interface NewActivity {
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
}

export interface ActivityPatch {
  title?: string;
  actionType?: string;
  unit?: XpUnit;
  xpPerGrant?: number;
  quantityPerGrant?: number;
  minQuantity?: number;
  active?: boolean;
  sortOrder?: number;
}

export interface NewDay {
  userId: string;
  challengeId: string;
  localDate: string;
  status: Exclude<ChallengeDayStatus, 'pending'>;
  obligationsMet: boolean;
  debtClosed: boolean;
  failureReason: string | null;
  settledAt: Date;
  streakAfter: number;
  bestStreakAfter: number;
  xpBalanceAfter: number;
}

export interface NewDebtItem {
  userId: string;
  challengeId: string;
  localDate: string;
  source: DebtItemRecord['source'];
  sourceId: string;
  title: string;
  required: boolean;
  state: DebtItemState;
  confirmedByUser: boolean;
  confirmedAt: Date | null;
  sortOrder: number;
}

export interface DebtPatch {
  title?: string;
  required?: boolean;
  state?: DebtItemState;
  confirmedByUser?: boolean;
  confirmedAt?: Date | null;
  sortOrder?: number;
}

export interface NewActivityLog {
  userId: string;
  challengeId: string;
  activityId: string;
  localDate: string;
  quantity: number;
  xpGranted: number;
  idempotencyKey: string;
}

export interface NewPurchase {
  userId: string;
  challengeId: string;
  rewardId: string;
  restrictionId: string | null;
  xpSpent: number;
  grantsBypass: boolean;
  idempotencyKey: string;
  purchasedAt: Date;
}

export interface NewTransaction {
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
}

/**
 * Persistence port for the ascent service. Production uses Prisma.
 * Tests use the in-memory store, including its transaction queue.
 */
export interface AscentStore {
  transaction<T>(fn: (store: AscentStore) => Promise<T>): Promise<T>;

  lockChallenge(userId: string, challengeId: string): Promise<ChallengeRecord | null>;
  findChallenge(userId: string, challengeId: string): Promise<ChallengeRecord | null>;
  findActiveChallenge(userId: string): Promise<ChallengeRecord | null>;
  listChallenges(userId: string): Promise<ChallengeRecord[]>;
  insertChallenge(input: NewChallenge): Promise<ChallengeRecord>;
  updateChallenge(id: string, patch: ChallengePatch): Promise<ChallengeRecord>;

  findHabit(habitId: string): Promise<HabitRecord | null>;
  saveHabit(habit: HabitRecord): Promise<HabitRecord>;

  listHabitLinks(challengeId: string): Promise<HabitLinkRecord[]>;
  findHabitLink(userId: string, linkId: string): Promise<HabitLinkRecord | null>;
  insertHabitLink(input: NewHabitLink): Promise<HabitLinkRecord>;
  deleteHabitLink(id: string): Promise<void>;

  listRewards(challengeId: string): Promise<RewardRecord[]>;
  findReward(userId: string, rewardId: string): Promise<RewardRecord | null>;
  insertReward(input: NewReward): Promise<RewardRecord>;
  updateReward(id: string, patch: RewardPatch): Promise<RewardRecord>;
  deleteReward(id: string): Promise<void>;

  listTriggers(challengeId: string): Promise<TriggerRecord[]>;
  findTrigger(userId: string, triggerId: string): Promise<TriggerRecord | null>;
  insertTrigger(input: NewTrigger): Promise<TriggerRecord>;
  updateTrigger(id: string, patch: TriggerPatch): Promise<TriggerRecord>;
  deleteTrigger(id: string): Promise<void>;

  listRestrictions(challengeId: string): Promise<RestrictionRecord[]>;
  findRestriction(userId: string, restrictionId: string): Promise<RestrictionRecord | null>;
  insertRestriction(input: NewRestriction): Promise<RestrictionRecord>;
  updateRestriction(id: string, patch: RestrictionPatch): Promise<RestrictionRecord>;
  deleteRestriction(id: string): Promise<void>;

  listCustomDebts(challengeId: string): Promise<CustomDebtRecord[]>;
  findCustomDebt(userId: string, debtId: string): Promise<CustomDebtRecord | null>;
  insertCustomDebt(input: NewCustomDebt): Promise<CustomDebtRecord>;
  updateCustomDebt(id: string, patch: CustomDebtPatch): Promise<CustomDebtRecord>;
  deleteCustomDebt(id: string): Promise<void>;

  listActivities(challengeId: string): Promise<ActivityRecord[]>;
  findActivity(userId: string, activityId: string): Promise<ActivityRecord | null>;
  insertActivity(input: NewActivity): Promise<ActivityRecord>;
  updateActivity(id: string, patch: ActivityPatch): Promise<ActivityRecord>;

  listDays(challengeId: string): Promise<DayRecord[]>;
  findDay(challengeId: string, localDate: string): Promise<DayRecord | null>;
  insertDay(input: NewDay): Promise<DayRecord>;

  listDebtItems(challengeId: string, localDate?: string): Promise<DebtItemRecord[]>;
  findDebtItem(userId: string, debtItemId: string): Promise<DebtItemRecord | null>;
  upsertDebtItem(input: NewDebtItem): Promise<DebtItemRecord>;
  updateDebtItem(id: string, patch: DebtPatch): Promise<DebtItemRecord>;

  insertActivityLog(input: NewActivityLog): Promise<ActivityLogRecord>;
  findActivityLogByKey(userId: string, idempotencyKey: string): Promise<ActivityLogRecord | null>;
  findActivityLog(userId: string, logId: string): Promise<ActivityLogRecord | null>;
  markActivityLogReversed(id: string, reversedAt: Date): Promise<ActivityLogRecord>;

  insertPurchase(input: NewPurchase): Promise<PurchaseRecord>;
  findPurchaseByKey(userId: string, idempotencyKey: string): Promise<PurchaseRecord | null>;
  findPurchase(userId: string, purchaseId: string): Promise<PurchaseRecord | null>;
  listPurchases(challengeId: string): Promise<PurchaseRecord[]>;
  markPermissionUsed(id: string, localDate: string, usedAt: Date): Promise<PurchaseRecord>;

  insertTransaction(input: NewTransaction): Promise<TransactionRecord>;
  findTransactionByKey(userId: string, idempotencyKey: string): Promise<TransactionRecord | null>;
  listTransactions(challengeId: string): Promise<TransactionRecord[]>;
}
