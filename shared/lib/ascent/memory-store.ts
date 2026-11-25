import { createAscentId } from '@/shared/lib/ascent/ids';
import type {
  ActivityLogRecord,
  ActivityRecord,
  ChallengeRecord,
  CustomDebtRecord,
  DayRecord,
  DebtItemRecord,
  HabitLinkRecord,
  HabitRecord,
  PurchaseRecord,
  RestrictionRecord,
  RewardRecord,
  TransactionRecord,
  TriggerRecord,
} from '@/shared/lib/ascent/records';
import {
  StoreConflict,
  type ActivityPatch,
  type AscentStore,
  type ChallengePatch,
  type CustomDebtPatch,
  type DebtPatch,
  type NewActivity,
  type NewActivityLog,
  type NewChallenge,
  type NewCustomDebt,
  type NewDay,
  type NewDebtItem,
  type NewHabitLink,
  type NewPurchase,
  type NewRestriction,
  type NewReward,
  type NewTransaction,
  type NewTrigger,
  type RestrictionPatch,
  type RewardPatch,
  type TriggerPatch,
} from '@/shared/lib/ascent/store';

function stamp(): Date {
  return new Date();
}

function conflict(name: string): never {
  throw new StoreConflict(name);
}

function snap<T>(value: T): T {
  return structuredClone(value);
}

export class MemoryAscentStore implements AscentStore {
  private chain: Promise<unknown> = Promise.resolve();
  private depth = 0;
  private challenges: ChallengeRecord[] = [];
  private rewards: RewardRecord[] = [];
  private triggers: TriggerRecord[] = [];
  private habits: HabitRecord[] = [];
  private habitLinks: HabitLinkRecord[] = [];
  private restrictions: RestrictionRecord[] = [];
  private customDebts: CustomDebtRecord[] = [];
  private activities: ActivityRecord[] = [];
  private logs: ActivityLogRecord[] = [];
  private purchases: PurchaseRecord[] = [];
  private transactions: TransactionRecord[] = [];
  private days: DayRecord[] = [];
  private debtItems: DebtItemRecord[] = [];

  transaction<T>(fn: (store: AscentStore) => Promise<T>): Promise<T> {
    if (this.depth > 0) return fn(this);

    const run = this.chain.then(async () => {
      this.depth += 1;
      const snapshot = this.capture();
      try {
        return await fn(this);
      } catch (error) {
        this.restore(snapshot);
        throw error;
      } finally {
        this.depth -= 1;
      }
    });
    this.chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async lockChallenge(userId: string, challengeId: string): Promise<ChallengeRecord | null> {
    return this.findChallenge(userId, challengeId);
  }

  async readSettlement(challengeId: string) {
    const [days, transactions, purchases, links, restrictions, customs, debtItems] = await Promise.all([
      this.listDays(challengeId),
      this.listTransactions(challengeId),
      this.listPurchases(challengeId),
      this.listHabitLinks(challengeId),
      this.listRestrictions(challengeId),
      this.listCustomDebts(challengeId),
      this.listDebtItems(challengeId),
    ]);
    const habits = [];
    for (const link of links) {
      const habit = await this.findHabit(link.habitId);
      if (habit) habits.push(habit);
    }
    return { days, transactions, purchases, links, habits, restrictions, customs, debtItems };
  }

  async findChallenge(userId: string, challengeId: string): Promise<ChallengeRecord | null> {
    const row = this.challenges.find((item) => item.id === challengeId && item.userId === userId);
    return row ? snap(row) : null;
  }

  async findActiveChallenge(userId: string): Promise<ChallengeRecord | null> {
    const row = this.challenges.find((item) => item.userId === userId && item.status === 'active');
    return row ? snap(row) : null;
  }

  async listChallenges(userId: string): Promise<ChallengeRecord[]> {
    return snap(
      this.challenges
        .filter((item) => item.userId === userId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    );
  }

  async insertChallenge(input: NewChallenge): Promise<ChallengeRecord> {
    if (this.challenges.some((item) => item.userId === input.userId && item.status === 'active')) {
      conflict('Challenge_userId_active_key');
    }
    const now = stamp();
    const row: ChallengeRecord = {
      id: createAscentId(),
      status: 'active',
      currentStreak: 0,
      bestStreak: 0,
      xpBalance: 0,
      xpEarnedTotal: 0,
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.challenges.push(row);
    return snap(row);
  }

  async updateChallenge(id: string, patch: ChallengePatch): Promise<ChallengeRecord> {
    const row = this.challenges.find((item) => item.id === id);
    if (!row) conflict('challenge_missing');
    if (patch.status === 'active') {
      const other = this.challenges.find(
        (item) => item.userId === row.userId && item.status === 'active' && item.id !== id
      );
      if (other) conflict('Challenge_userId_active_key');
    }
    Object.assign(row, patch, { updatedAt: stamp() });
    return snap(row);
  }

  async findHabit(habitId: string): Promise<HabitRecord | null> {
    const row = this.habits.find((item) => item.id === habitId);
    return row ? snap(row) : null;
  }

  async saveHabit(habit: HabitRecord): Promise<HabitRecord> {
    const index = this.habits.findIndex((item) => item.id === habit.id);
    if (index >= 0) this.habits[index] = habit;
    else this.habits.push(habit);
    return habit;
  }

  async listHabitLinks(challengeId: string): Promise<HabitLinkRecord[]> {
    return this.habitLinks
      .filter((item) => item.challengeId === challengeId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async findHabitLink(userId: string, linkId: string): Promise<HabitLinkRecord | null> {
    return this.habitLinks.find((item) => item.id === linkId && item.userId === userId) ?? null;
  }

  async insertHabitLink(input: NewHabitLink): Promise<HabitLinkRecord> {
    if (this.habitLinks.some((item) => item.challengeId === input.challengeId && item.habitId === input.habitId)) {
      conflict('ChallengeHabit_challengeId_habitId_key');
    }
    const now = stamp();
    const row: HabitLinkRecord = { id: createAscentId(), createdAt: now, updatedAt: now, ...input };
    this.habitLinks.push(row);
    return snap(row);
  }

  async deleteHabitLink(id: string): Promise<void> {
    this.habitLinks = this.habitLinks.filter((item) => item.id !== id);
  }

  async listRewards(challengeId: string): Promise<RewardRecord[]> {
    return this.rewards
      .filter((item) => item.challengeId === challengeId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async findReward(userId: string, rewardId: string): Promise<RewardRecord | null> {
    return this.rewards.find((item) => item.id === rewardId && item.userId === userId) ?? null;
  }

  async insertReward(input: NewReward): Promise<RewardRecord> {
    const now = stamp();
    const row: RewardRecord = { id: createAscentId(), createdAt: now, updatedAt: now, ...input };
    this.rewards.push(row);
    return snap(row);
  }

  async updateReward(id: string, patch: RewardPatch): Promise<RewardRecord> {
    const row = this.rewards.find((item) => item.id === id);
    if (!row) conflict('reward_missing');
    Object.assign(row, patch, { updatedAt: stamp() });
    return snap(row);
  }

  async deleteReward(id: string): Promise<void> {
    if (this.restrictions.some((item) => item.rewardId === id) || this.purchases.some((item) => item.rewardId === id)) {
      conflict('resource_in_use');
    }
    this.rewards = this.rewards.filter((item) => item.id !== id);
  }

  async listTriggers(challengeId: string): Promise<TriggerRecord[]> {
    return this.triggers
      .filter((item) => item.challengeId === challengeId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async findTrigger(userId: string, triggerId: string): Promise<TriggerRecord | null> {
    return this.triggers.find((item) => item.id === triggerId && item.userId === userId) ?? null;
  }

  async insertTrigger(input: NewTrigger): Promise<TriggerRecord> {
    const now = stamp();
    const row: TriggerRecord = { id: createAscentId(), createdAt: now, updatedAt: now, ...input };
    this.triggers.push(row);
    return snap(row);
  }

  async updateTrigger(id: string, patch: TriggerPatch): Promise<TriggerRecord> {
    const row = this.triggers.find((item) => item.id === id);
    if (!row) conflict('trigger_missing');
    Object.assign(row, patch, { updatedAt: stamp() });
    return snap(row);
  }

  async deleteTrigger(id: string): Promise<void> {
    this.triggers = this.triggers.filter((item) => item.id !== id);
  }

  async listRestrictions(challengeId: string): Promise<RestrictionRecord[]> {
    return this.restrictions
      .filter((item) => item.challengeId === challengeId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async findRestriction(userId: string, restrictionId: string): Promise<RestrictionRecord | null> {
    return this.restrictions.find((item) => item.id === restrictionId && item.userId === userId) ?? null;
  }

  async insertRestriction(input: NewRestriction): Promise<RestrictionRecord> {
    const now = stamp();
    const row: RestrictionRecord = { id: createAscentId(), createdAt: now, updatedAt: now, ...input };
    this.restrictions.push(row);
    return snap(row);
  }

  async updateRestriction(id: string, patch: RestrictionPatch): Promise<RestrictionRecord> {
    const row = this.restrictions.find((item) => item.id === id);
    if (!row) conflict('restriction_missing');
    Object.assign(row, patch, { updatedAt: stamp() });
    return snap(row);
  }

  async deleteRestriction(id: string): Promise<void> {
    if (this.purchases.some((item) => item.restrictionId === id)) conflict('resource_in_use');
    this.restrictions = this.restrictions.filter((item) => item.id !== id);
  }

  async listCustomDebts(challengeId: string): Promise<CustomDebtRecord[]> {
    return this.customDebts
      .filter((item) => item.challengeId === challengeId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async findCustomDebt(userId: string, debtId: string): Promise<CustomDebtRecord | null> {
    return this.customDebts.find((item) => item.id === debtId && item.userId === userId) ?? null;
  }

  async insertCustomDebt(input: NewCustomDebt): Promise<CustomDebtRecord> {
    const now = stamp();
    const row: CustomDebtRecord = { id: createAscentId(), createdAt: now, updatedAt: now, ...input };
    this.customDebts.push(row);
    return snap(row);
  }

  async updateCustomDebt(id: string, patch: CustomDebtPatch): Promise<CustomDebtRecord> {
    const row = this.customDebts.find((item) => item.id === id);
    if (!row) conflict('custom_debt_missing');
    Object.assign(row, patch, { updatedAt: stamp() });
    return snap(row);
  }

  async deleteCustomDebt(id: string): Promise<void> {
    this.customDebts = this.customDebts.filter((item) => item.id !== id);
  }

  async listActivities(challengeId: string): Promise<ActivityRecord[]> {
    return this.activities
      .filter((item) => item.challengeId === challengeId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async findActivity(userId: string, activityId: string): Promise<ActivityRecord | null> {
    return this.activities.find((item) => item.id === activityId && item.userId === userId) ?? null;
  }

  async insertActivity(input: NewActivity): Promise<ActivityRecord> {
    const now = stamp();
    const row: ActivityRecord = { id: createAscentId(), createdAt: now, updatedAt: now, ...input };
    this.activities.push(row);
    return snap(row);
  }

  async updateActivity(id: string, patch: ActivityPatch): Promise<ActivityRecord> {
    const row = this.activities.find((item) => item.id === id);
    if (!row) conflict('activity_missing');
    Object.assign(row, patch, { updatedAt: stamp() });
    return snap(row);
  }

  async listDays(challengeId: string): Promise<DayRecord[]> {
    return this.days
      .filter((item) => item.challengeId === challengeId)
      .sort((left, right) => left.localDate.localeCompare(right.localDate));
  }

  async findDay(challengeId: string, localDate: string): Promise<DayRecord | null> {
    return this.days.find((item) => item.challengeId === challengeId && item.localDate === localDate) ?? null;
  }

  async insertDay(input: NewDay): Promise<DayRecord> {
    if (this.days.some((item) => item.challengeId === input.challengeId && item.localDate === input.localDate)) {
      conflict('ChallengeDay_challengeId_localDate_key');
    }
    const now = stamp();
    const row: DayRecord = { id: createAscentId(), createdAt: now, updatedAt: now, ...input };
    this.days.push(row);
    return snap(row);
  }

  async listDebtItems(challengeId: string, localDate?: string): Promise<DebtItemRecord[]> {
    return this.debtItems
      .filter((item) => item.challengeId === challengeId && (localDate == null || item.localDate === localDate))
      .sort((left, right) => left.sortOrder - right.sortOrder || left.sourceId.localeCompare(right.sourceId));
  }

  async findDebtItem(userId: string, debtItemId: string): Promise<DebtItemRecord | null> {
    return this.debtItems.find((item) => item.id === debtItemId && item.userId === userId) ?? null;
  }

  async upsertDebtItem(input: NewDebtItem): Promise<DebtItemRecord> {
    const existing = this.debtItems.find(
      (item) =>
        item.challengeId === input.challengeId &&
        item.localDate === input.localDate &&
        item.source === input.source &&
        item.sourceId === input.sourceId
    );
    if (!existing) {
      const now = stamp();
      const row: DebtItemRecord = { id: createAscentId(), createdAt: now, updatedAt: now, ...input };
      this.debtItems.push(row);
      return snap(row);
    }
    Object.assign(existing, input, { id: existing.id, createdAt: existing.createdAt, updatedAt: stamp() });
    return existing;
  }

  async updateDebtItem(id: string, patch: DebtPatch): Promise<DebtItemRecord> {
    const row = this.debtItems.find((item) => item.id === id);
    if (!row) conflict('debt_missing');
    Object.assign(row, patch, { updatedAt: stamp() });
    return snap(row);
  }

  async insertActivityLog(input: NewActivityLog): Promise<ActivityLogRecord> {
    if (this.logs.some((item) => item.userId === input.userId && item.idempotencyKey === input.idempotencyKey)) {
      conflict('ChallengeActivityLog_userId_idempotencyKey_key');
    }
    const row: ActivityLogRecord = {
      id: createAscentId(),
      reversedAt: null,
      createdAt: stamp(),
      ...input,
    };
    this.logs.push(row);
    return snap(row);
  }

  async findActivityLogByKey(userId: string, idempotencyKey: string): Promise<ActivityLogRecord | null> {
    return this.logs.find((item) => item.userId === userId && item.idempotencyKey === idempotencyKey) ?? null;
  }

  async findActivityLog(userId: string, logId: string): Promise<ActivityLogRecord | null> {
    return this.logs.find((item) => item.id === logId && item.userId === userId) ?? null;
  }

  async markActivityLogReversed(id: string, reversedAt: Date): Promise<ActivityLogRecord> {
    const row = this.logs.find((item) => item.id === id);
    if (!row) conflict('log_missing');
    row.reversedAt = reversedAt;
    return snap(row);
  }

  async insertPurchase(input: NewPurchase): Promise<PurchaseRecord> {
    if (this.purchases.some((item) => item.userId === input.userId && item.idempotencyKey === input.idempotencyKey)) {
      conflict('ChallengeRewardPurchase_userId_idempotencyKey_key');
    }
    const row: PurchaseRecord = {
      id: createAscentId(),
      permissionUsed: false,
      permissionUsedAt: null,
      usedOnLocalDate: null,
      ...input,
    };
    this.purchases.push(row);
    return snap(row);
  }

  async findPurchaseByKey(userId: string, idempotencyKey: string): Promise<PurchaseRecord | null> {
    return this.purchases.find((item) => item.userId === userId && item.idempotencyKey === idempotencyKey) ?? null;
  }

  async findPurchase(userId: string, purchaseId: string): Promise<PurchaseRecord | null> {
    return this.purchases.find((item) => item.id === purchaseId && item.userId === userId) ?? null;
  }

  async listPurchases(challengeId: string): Promise<PurchaseRecord[]> {
    return this.purchases
      .filter((item) => item.challengeId === challengeId)
      .sort((left, right) => left.purchasedAt.getTime() - right.purchasedAt.getTime());
  }

  async markPermissionUsed(id: string, localDate: string, usedAt: Date): Promise<PurchaseRecord> {
    const row = this.purchases.find((item) => item.id === id);
    if (!row) conflict('purchase_missing');
    row.permissionUsed = true;
    row.permissionUsedAt = usedAt;
    row.usedOnLocalDate = localDate;
    return snap(row);
  }

  async insertTransaction(input: NewTransaction): Promise<TransactionRecord> {
    if (
      this.transactions.some((item) => item.userId === input.userId && item.idempotencyKey === input.idempotencyKey)
    ) {
      conflict('ChallengeXpTransaction_userId_idempotencyKey_key');
    }
    if (input.purchaseId && this.transactions.some((item) => item.purchaseId === input.purchaseId)) {
      conflict('ChallengeXpTransaction_purchaseId_key');
    }
    const row: TransactionRecord = { id: createAscentId(), createdAt: stamp(), ...input };
    this.transactions.push(row);
    return snap(row);
  }

  async findTransactionByKey(userId: string, idempotencyKey: string): Promise<TransactionRecord | null> {
    return this.transactions.find((item) => item.userId === userId && item.idempotencyKey === idempotencyKey) ?? null;
  }

  async listTransactions(challengeId: string): Promise<TransactionRecord[]> {
    return this.transactions
      .filter((item) => item.challengeId === challengeId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private capture() {
    return {
      challenges: snap(this.challenges),
      rewards: snap(this.rewards),
      triggers: snap(this.triggers),
      habits: snap(this.habits),
      habitLinks: snap(this.habitLinks),
      restrictions: snap(this.restrictions),
      customDebts: snap(this.customDebts),
      activities: snap(this.activities),
      logs: snap(this.logs),
      purchases: snap(this.purchases),
      transactions: snap(this.transactions),
      days: snap(this.days),
      debtItems: snap(this.debtItems),
    };
  }

  private restore(snapshot: ReturnType<MemoryAscentStore['capture']>) {
    this.challenges = snapshot.challenges;
    this.rewards = snapshot.rewards;
    this.triggers = snapshot.triggers;
    this.habits = snapshot.habits;
    this.habitLinks = snapshot.habitLinks;
    this.restrictions = snapshot.restrictions;
    this.customDebts = snapshot.customDebts;
    this.activities = snapshot.activities;
    this.logs = snapshot.logs;
    this.purchases = snapshot.purchases;
    this.transactions = snapshot.transactions;
    this.days = snapshot.days;
    this.debtItems = snapshot.debtItems;
  }
}

export function createMemoryAscentStore(): AscentStore {
  return new MemoryAscentStore();
}
