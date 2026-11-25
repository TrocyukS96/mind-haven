import { Prisma, PrismaClient } from '@prisma/client';
import type {
  ChallengeDayStatus,
  ChallengeStatus,
  DebtItemState,
  DebtSource,
  RestrictionKind,
  XpTransactionReason,
  XpUnit,
} from '@/entities/ascent/model/types';
import { prisma } from '@/shared/lib/db';
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

type Db = PrismaClient | Prisma.TransactionClient;

let ascentWrites: Promise<void> = Promise.resolve();

function enqueueAscentWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = ascentWrites.then(fn, fn);
  ascentWrites = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function asNumber(value: Prisma.Decimal | number | string): number {
  return Number(value);
}

function textList(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function countMap(value: Prisma.JsonValue): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const counts: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (typeof count === 'number') counts[key] = count;
  }
  return counts;
}

async function wrap<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = String((error as { code?: unknown }).code);
      const target = (error as { meta?: { target?: unknown } }).meta?.target;
      const message = error instanceof Error ? error.message : '';
      if (code === 'P2002') throw new StoreConflict(`${JSON.stringify(target ?? '')} ${message}`);
      if (code === 'P2003' || code === 'P2014') throw new StoreConflict('resource_in_use');
    }
    throw error;
  }
}

function mapChallenge(row: {
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
}): ChallengeRecord {
  return row;
}

export class PrismaAscentStore implements AscentStore {
  constructor(
    private readonly db: Db,
    private readonly nested = false
  ) {}

  transaction<T>(fn: (store: AscentStore) => Promise<T>): Promise<T> {
    if (this.nested) return fn(this);
    const client = this.db as PrismaClient;
    return enqueueAscentWrite(async () => {
      await client.$connect();
      return client.$transaction((tx) => fn(new PrismaAscentStore(tx, true)), {
        maxWait: 20_000,
        timeout: 30_000,
      });
    });
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
    const habits =
      links.length === 0
        ? []
        : (
            await this.db.habit.findMany({
              where: { id: { in: links.map((link) => link.habitId) } },
            })
          ).map((row) => ({
            id: row.id,
            userId: row.userId,
            name: row.name,
            frequency: row.frequency,
            streak: row.streak,
            completedDays: textList(row.completedDays),
            trackingType: row.trackingType,
            targetCount: row.targetCount,
            dayCounts: countMap(row.dayCounts),
          }));
    return { days, transactions, purchases, links, habits, restrictions, customs, debtItems };
  }

  async lockChallenge(userId: string, challengeId: string): Promise<ChallengeRecord | null> {
    const rows = await this.db.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Challenge"
      WHERE "id" = ${challengeId} AND "userId" = ${userId}
      FOR UPDATE
    `;
    if (rows.length === 0) return null;
    return this.findChallenge(userId, challengeId);
  }

  async findChallenge(userId: string, challengeId: string): Promise<ChallengeRecord | null> {
    const row = await this.db.challenge.findFirst({ where: { id: challengeId, userId } });
    return row ? mapChallenge(row) : null;
  }

  async findActiveChallenge(userId: string): Promise<ChallengeRecord | null> {
    const row = await this.db.challenge.findFirst({ where: { userId, status: 'active' } });
    return row ? mapChallenge(row) : null;
  }

  async listChallenges(userId: string): Promise<ChallengeRecord[]> {
    const rows = await this.db.challenge.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    return rows.map(mapChallenge);
  }

  async insertChallenge(input: NewChallenge): Promise<ChallengeRecord> {
    const row = await wrap(() =>
      this.db.challenge.create({
        data: {
          ...input,
          status: 'active',
          currentStreak: 0,
          bestStreak: 0,
          xpBalance: 0,
          xpEarnedTotal: 0,
        },
      })
    );
    return mapChallenge(row);
  }

  async updateChallenge(id: string, patch: ChallengePatch): Promise<ChallengeRecord> {
    const row = await wrap(() => this.db.challenge.update({ where: { id }, data: patch }));
    return mapChallenge(row);
  }

  async findHabit(habitId: string): Promise<HabitRecord | null> {
    const row = await this.db.habit.findUnique({ where: { id: habitId } });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      frequency: row.frequency,
      streak: row.streak,
      completedDays: textList(row.completedDays),
      trackingType: row.trackingType,
      targetCount: row.targetCount,
      dayCounts: countMap(row.dayCounts),
    };
  }

  async saveHabit(habit: HabitRecord): Promise<HabitRecord> {
    await this.db.habit.upsert({
      where: { id: habit.id },
      create: {
        id: habit.id,
        userId: habit.userId,
        name: habit.name,
        frequency: habit.frequency,
        streak: habit.streak,
        completedDays: habit.completedDays,
        trackingType: habit.trackingType,
        targetCount: habit.targetCount,
        dayCounts: habit.dayCounts,
      },
      update: {
        name: habit.name,
        frequency: habit.frequency,
        streak: habit.streak,
        completedDays: habit.completedDays,
        trackingType: habit.trackingType,
        targetCount: habit.targetCount,
        dayCounts: habit.dayCounts,
      },
    });
    return habit;
  }

  async listHabitLinks(challengeId: string): Promise<HabitLinkRecord[]> {
    return this.db.challengeHabit.findMany({ where: { challengeId }, orderBy: { sortOrder: 'asc' } });
  }

  async findHabitLink(userId: string, linkId: string): Promise<HabitLinkRecord | null> {
    return this.db.challengeHabit.findFirst({ where: { id: linkId, userId } });
  }

  async insertHabitLink(input: NewHabitLink): Promise<HabitLinkRecord> {
    return wrap(() => this.db.challengeHabit.create({ data: input }));
  }

  async deleteHabitLink(id: string): Promise<void> {
    await this.db.challengeHabit.delete({ where: { id } });
  }

  async listRewards(challengeId: string): Promise<RewardRecord[]> {
    return this.db.challengeReward.findMany({ where: { challengeId }, orderBy: { sortOrder: 'asc' } });
  }

  async findReward(userId: string, rewardId: string): Promise<RewardRecord | null> {
    return this.db.challengeReward.findFirst({ where: { id: rewardId, userId } });
  }

  async insertReward(input: NewReward): Promise<RewardRecord> {
    return wrap(() => this.db.challengeReward.create({ data: input }));
  }

  async updateReward(id: string, patch: RewardPatch): Promise<RewardRecord> {
    return wrap(() => this.db.challengeReward.update({ where: { id }, data: patch }));
  }

  async deleteReward(id: string): Promise<void> {
    await wrap(() => this.db.challengeReward.delete({ where: { id } }));
  }

  async listTriggers(challengeId: string): Promise<TriggerRecord[]> {
    return this.db.challengeTrigger.findMany({ where: { challengeId }, orderBy: { sortOrder: 'asc' } });
  }

  async findTrigger(userId: string, triggerId: string): Promise<TriggerRecord | null> {
    return this.db.challengeTrigger.findFirst({ where: { id: triggerId, userId } });
  }

  async insertTrigger(input: NewTrigger): Promise<TriggerRecord> {
    return this.db.challengeTrigger.create({ data: input });
  }

  async updateTrigger(id: string, patch: TriggerPatch): Promise<TriggerRecord> {
    return this.db.challengeTrigger.update({ where: { id }, data: patch });
  }

  async deleteTrigger(id: string): Promise<void> {
    await this.db.challengeTrigger.delete({ where: { id } });
  }

  async listRestrictions(challengeId: string): Promise<RestrictionRecord[]> {
    const rows = await this.db.challengeRestriction.findMany({
      where: { challengeId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((row) => ({ ...row, kind: row.kind as RestrictionKind }));
  }

  async findRestriction(userId: string, restrictionId: string): Promise<RestrictionRecord | null> {
    const row = await this.db.challengeRestriction.findFirst({ where: { id: restrictionId, userId } });
    return row ? { ...row, kind: row.kind as RestrictionKind } : null;
  }

  async insertRestriction(input: NewRestriction): Promise<RestrictionRecord> {
    const row = await wrap(() => this.db.challengeRestriction.create({ data: input }));
    return { ...row, kind: row.kind as RestrictionKind };
  }

  async updateRestriction(id: string, patch: RestrictionPatch): Promise<RestrictionRecord> {
    const row = await wrap(() => this.db.challengeRestriction.update({ where: { id }, data: patch }));
    return { ...row, kind: row.kind as RestrictionKind };
  }

  async deleteRestriction(id: string): Promise<void> {
    await wrap(() => this.db.challengeRestriction.delete({ where: { id } }));
  }

  async listCustomDebts(challengeId: string): Promise<CustomDebtRecord[]> {
    return this.db.challengeCustomDebt.findMany({ where: { challengeId }, orderBy: { sortOrder: 'asc' } });
  }

  async findCustomDebt(userId: string, debtId: string): Promise<CustomDebtRecord | null> {
    return this.db.challengeCustomDebt.findFirst({ where: { id: debtId, userId } });
  }

  async insertCustomDebt(input: NewCustomDebt): Promise<CustomDebtRecord> {
    return this.db.challengeCustomDebt.create({ data: input });
  }

  async updateCustomDebt(id: string, patch: CustomDebtPatch): Promise<CustomDebtRecord> {
    return this.db.challengeCustomDebt.update({ where: { id }, data: patch });
  }

  async deleteCustomDebt(id: string): Promise<void> {
    await this.db.challengeCustomDebt.delete({ where: { id } });
  }

  async listActivities(challengeId: string): Promise<ActivityRecord[]> {
    const rows = await this.db.challengeXpActivity.findMany({
      where: { challengeId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(mapActivity);
  }

  async findActivity(userId: string, activityId: string): Promise<ActivityRecord | null> {
    const row = await this.db.challengeXpActivity.findFirst({ where: { id: activityId, userId } });
    return row ? mapActivity(row) : null;
  }

  async insertActivity(input: NewActivity): Promise<ActivityRecord> {
    const row = await wrap(() => this.db.challengeXpActivity.create({ data: input }));
    return mapActivity(row);
  }

  async updateActivity(id: string, patch: ActivityPatch): Promise<ActivityRecord> {
    const row = await wrap(() => this.db.challengeXpActivity.update({ where: { id }, data: patch }));
    return mapActivity(row);
  }

  async listDays(challengeId: string): Promise<DayRecord[]> {
    const rows = await this.db.challengeDay.findMany({
      where: { challengeId },
      orderBy: { localDate: 'asc' },
    });
    return rows.map((row) => ({ ...row, status: row.status as ChallengeDayStatus }));
  }

  async findDay(challengeId: string, localDate: string): Promise<DayRecord | null> {
    const row = await this.db.challengeDay.findUnique({
      where: { challengeId_localDate: { challengeId, localDate } },
    });
    return row ? { ...row, status: row.status as ChallengeDayStatus } : null;
  }

  async insertDay(input: NewDay): Promise<DayRecord> {
    const row = await wrap(() => this.db.challengeDay.create({ data: input }));
    return { ...row, status: row.status as ChallengeDayStatus };
  }

  async listDebtItems(challengeId: string, localDate?: string): Promise<DebtItemRecord[]> {
    const rows = await this.db.challengeDebtItem.findMany({
      where: { challengeId, ...(localDate ? { localDate } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { sourceId: 'asc' }],
    });
    return rows.map(mapDebt);
  }

  async findDebtItem(userId: string, debtItemId: string): Promise<DebtItemRecord | null> {
    const row = await this.db.challengeDebtItem.findFirst({ where: { id: debtItemId, userId } });
    return row ? mapDebt(row) : null;
  }

  async upsertDebtItem(input: NewDebtItem): Promise<DebtItemRecord> {
    const row = await this.db.challengeDebtItem.upsert({
      where: {
        challengeId_localDate_source_sourceId: {
          challengeId: input.challengeId,
          localDate: input.localDate,
          source: input.source,
          sourceId: input.sourceId,
        },
      },
      create: input,
      update: {
        title: input.title,
        required: input.required,
        state: input.state,
        confirmedByUser: input.confirmedByUser,
        confirmedAt: input.confirmedAt,
        sortOrder: input.sortOrder,
      },
    });
    return mapDebt(row);
  }

  async updateDebtItem(id: string, patch: DebtPatch): Promise<DebtItemRecord> {
    const row = await this.db.challengeDebtItem.update({ where: { id }, data: patch });
    return mapDebt(row);
  }

  async insertActivityLog(input: NewActivityLog): Promise<ActivityLogRecord> {
    const row = await wrap(() => this.db.challengeActivityLog.create({ data: input }));
    return mapLog(row);
  }

  async findActivityLogByKey(userId: string, idempotencyKey: string): Promise<ActivityLogRecord | null> {
    const row = await this.db.challengeActivityLog.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    return row ? mapLog(row) : null;
  }

  async findActivityLog(userId: string, logId: string): Promise<ActivityLogRecord | null> {
    const row = await this.db.challengeActivityLog.findFirst({ where: { id: logId, userId } });
    return row ? mapLog(row) : null;
  }

  async markActivityLogReversed(id: string, reversedAt: Date): Promise<ActivityLogRecord> {
    const row = await this.db.challengeActivityLog.update({ where: { id }, data: { reversedAt } });
    return mapLog(row);
  }

  async insertPurchase(input: NewPurchase): Promise<PurchaseRecord> {
    const row = await wrap(() => this.db.challengeRewardPurchase.create({ data: input }));
    return row;
  }

  async findPurchaseByKey(userId: string, idempotencyKey: string): Promise<PurchaseRecord | null> {
    return this.db.challengeRewardPurchase.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
  }

  async findPurchase(userId: string, purchaseId: string): Promise<PurchaseRecord | null> {
    return this.db.challengeRewardPurchase.findFirst({ where: { id: purchaseId, userId } });
  }

  async listPurchases(challengeId: string): Promise<PurchaseRecord[]> {
    return this.db.challengeRewardPurchase.findMany({
      where: { challengeId },
      orderBy: { purchasedAt: 'asc' },
    });
  }

  async markPermissionUsed(id: string, localDate: string, usedAt: Date): Promise<PurchaseRecord> {
    return this.db.challengeRewardPurchase.update({
      where: { id },
      data: { permissionUsed: true, permissionUsedAt: usedAt, usedOnLocalDate: localDate },
    });
  }

  async insertTransaction(input: NewTransaction): Promise<TransactionRecord> {
    const row = await wrap(() => this.db.challengeXpTransaction.create({ data: input }));
    return { ...row, reason: row.reason as XpTransactionReason };
  }

  async findTransactionByKey(userId: string, idempotencyKey: string): Promise<TransactionRecord | null> {
    const row = await this.db.challengeXpTransaction.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    return row ? { ...row, reason: row.reason as XpTransactionReason } : null;
  }

  async listTransactions(challengeId: string): Promise<TransactionRecord[]> {
    const rows = await this.db.challengeXpTransaction.findMany({
      where: { challengeId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({ ...row, reason: row.reason as XpTransactionReason }));
  }
}

function mapActivity(row: {
  id: string;
  userId: string;
  challengeId: string;
  title: string;
  actionType: string;
  unit: XpUnit;
  xpPerGrant: number;
  quantityPerGrant: Prisma.Decimal;
  minQuantity: Prisma.Decimal;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): ActivityRecord {
  return {
    ...row,
    unit: row.unit as XpUnit,
    quantityPerGrant: asNumber(row.quantityPerGrant),
    minQuantity: asNumber(row.minQuantity),
  };
}

function mapLog(row: {
  id: string;
  userId: string;
  challengeId: string;
  activityId: string;
  localDate: string;
  quantity: Prisma.Decimal;
  xpGranted: number;
  idempotencyKey: string;
  reversedAt: Date | null;
  createdAt: Date;
}): ActivityLogRecord {
  return { ...row, quantity: asNumber(row.quantity) };
}

function mapDebt(row: {
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
}): DebtItemRecord {
  return {
    ...row,
    source: row.source as DebtSource,
    state: row.state as DebtItemState,
  };
}

export const prismaAscentStore: AscentStore = new PrismaAscentStore(prisma);
