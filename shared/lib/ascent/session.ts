import type { AscentState, DayFailureReason } from '@/entities/ascent/model/types';
import {
  evaluateDay,
  type CustomObligationInput,
  type DayEvaluation,
  type HabitObligationInput,
  type RestrictionObligationInput,
} from '@/shared/lib/ascent/day-result';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import { habitObligationForDate } from '@/shared/lib/ascent/habit-obligation';
import { ascentKey } from '@/shared/lib/ascent/keys';
import { formatLocalDate } from '@/shared/lib/ascent/local-date';
import type {
  ChallengeRecord,
  CustomDebtRecord,
  DebtItemRecord,
  HabitLinkRecord,
  HabitRecord,
  PurchaseRecord,
  RestrictionRecord,
} from '@/shared/lib/ascent/records';
import { settleElapsedDays, type SettlementResult } from '@/shared/lib/ascent/settlement';
import { assertAscentInvariants } from '@/shared/lib/ascent/state';
import { StoreConflict, type AscentStore } from '@/shared/lib/ascent/store';

export function rethrowStore(error: unknown): never {
  if (!(error instanceof StoreConflict)) throw error;

  const name = error.constraint;
  if (name.includes('active')) throw new AscentRuleError('active_challenge_exists');
  if (name.includes('habitId') || name.includes('Habit')) throw new AscentRuleError('habit_already_linked');
  if (name.includes('resource_in_use')) throw new AscentRuleError('resource_in_use');
  if (name.includes('idempotency') || name.includes('Idempotency')) {
    throw new AscentRuleError('invalid_idempotency_key');
  }
  throw new AscentRuleError('invariant_broken');
}

export async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    rethrowStore(error);
  }
}

interface ObligationSnapshot {
  links: HabitLinkRecord[];
  habits: Map<string, HabitRecord>;
  restrictions: RestrictionRecord[];
  customs: CustomDebtRecord[];
  debtItems: DebtItemRecord[];
  purchases: PurchaseRecord[];
}

export async function appliedKeys(store: AscentStore, challengeId: string): Promise<string[]> {
  const [transactions, purchases, days] = await Promise.all([
    store.listTransactions(challengeId),
    store.listPurchases(challengeId),
    store.listDays(challengeId),
  ]);

  return [
    ...transactions.map((item) => item.idempotencyKey),
    ...purchases.map((item) => item.idempotencyKey),
    ...days.map((item) => ascentKey(challengeId, `day:${item.localDate}`)),
  ];
}

export function toAscentState(challenge: ChallengeRecord, keys: readonly string[]): AscentState {
  if (challenge.status === 'paused') throw new AscentRuleError('challenge_not_active');

  const state: AscentState = {
    status: challenge.status,
    currentStreak: challenge.currentStreak,
    bestStreak: challenge.bestStreak,
    xpBalance: challenge.xpBalance,
    xpEarnedTotal: challenge.xpEarnedTotal,
    pauseStartedOn: null,
    appliedKeys: keys,
  };
  assertAscentInvariants(state);
  return state;
}

async function loadObligations(store: AscentStore, challenge: ChallengeRecord): Promise<ObligationSnapshot> {
  const [links, restrictions, customs, debtItems, purchases] = await Promise.all([
    store.listHabitLinks(challenge.id),
    store.listRestrictions(challenge.id),
    store.listCustomDebts(challenge.id),
    store.listDebtItems(challenge.id),
    store.listPurchases(challenge.id),
  ]);
  const habits = new Map<string, HabitRecord>();

  for (const link of links) {
    const habit = await store.findHabit(link.habitId);
    if (habit && habit.userId === challenge.userId) habits.set(habit.id, habit);
  }

  return { links, habits, restrictions, customs, debtItems, purchases };
}

function restrictionFlags(
  restriction: RestrictionRecord,
  localDate: string,
  debtItems: readonly DebtItemRecord[],
  purchases: readonly PurchaseRecord[]
) {
  const debt = debtItems.find(
    (item) => item.localDate === localDate && item.source === 'restriction' && item.sourceId === restriction.id
  );
  const bypassed = purchases.some(
    (item) =>
      item.restrictionId === restriction.id &&
      item.grantsBypass &&
      item.permissionUsed &&
      item.usedOnLocalDate === localDate
  );

  return {
    honored: debt?.state === 'satisfied',
    violated: Boolean(debt && debt.state === 'missed' && debt.confirmedByUser),
    bypassed,
  };
}

function evaluateSnapshot(
  snapshot: ObligationSnapshot,
  localDate: string,
  streakAtStart: number,
  finalize: boolean
): DayEvaluation {
  const habits: HabitObligationInput[] = [];
  for (const link of snapshot.links) {
    const habit = snapshot.habits.get(link.habitId);
    if (!habit) continue;
    habits.push(
      habitObligationForDate(
        {
          id: habit.id,
          name: habit.name,
          frequency: habit.frequency,
          targetCount: habit.targetCount,
          completedDays: habit.completedDays,
          dayCounts: habit.dayCounts,
        },
        localDate,
        { required: link.required, sortOrder: link.sortOrder }
      )
    );
  }

  const restrictions: RestrictionObligationInput[] = snapshot.restrictions.map((restriction) => ({
    id: restriction.id,
    title: restriction.title,
    kind: restriction.kind,
    required: restriction.required,
    active: restriction.active,
    bypassable: restriction.bypassable,
    unlockAfterSuccessfulDays: restriction.unlockAfterSuccessfulDays,
    sortOrder: restriction.sortOrder,
    ...restrictionFlags(restriction, localDate, snapshot.debtItems, snapshot.purchases),
  }));

  const customs: CustomObligationInput[] = snapshot.customs.map((debt) => ({
    id: debt.id,
    title: debt.title,
    required: debt.required,
    active: debt.active,
    sortOrder: debt.sortOrder,
    confirmed: snapshot.debtItems.some(
      (item) =>
        item.localDate === localDate &&
        item.source === 'custom' &&
        item.sourceId === debt.id &&
        item.state === 'satisfied'
    ),
  }));

  return evaluateDay({ streakAtStart, finalize, habits, restrictions, customs });
}

export async function persistSettlement(
  store: AscentStore,
  challenge: ChallengeRecord,
  now: Date
): Promise<ChallengeRecord> {
  if (challenge.status === 'completed' || challenge.status === 'archived') return challenge;
  if (challenge.status !== 'active') throw new AscentRuleError('challenge_not_active');

  const [days, keys, snapshot] = await Promise.all([
    store.listDays(challenge.id),
    appliedKeys(store, challenge.id),
    loadObligations(store, challenge),
  ]);
  const settled = days.filter((day) => day.status !== 'pending');
  const settledDates = settled.map((day) => day.localDate);
  const challengeOn = formatLocalDate(challenge.startsAt, challenge.timezone);
  const abstinenceOn = formatLocalDate(challenge.abstinenceStartedAt, challenge.timezone);
  const today = formatLocalDate(now, challenge.timezone);
  const credit =
    today >= challengeOn && abstinenceOn < challengeOn && settled.every((day) => day.status !== 'failed');
  const result = settleElapsedDays({
    state: toAscentState(challenge, keys),
    challengeId: challenge.id,
    timezone: challenge.timezone,
    startsOn: credit ? abstinenceOn : challengeOn,
    creditBefore: credit ? challengeOn : undefined,
    targetDays: challenge.targetDays,
    now,
    settledDates,
    evaluate: (localDate, streakAtStart) => evaluateSnapshot(snapshot, localDate, streakAtStart, true),
  });

  return writeSettlement(store, challenge, now, result);
}

async function writeSettlement(
  store: AscentStore,
  challenge: ChallengeRecord,
  now: Date,
  result: SettlementResult
): Promise<ChallengeRecord> {
  for (const day of result.days) {
    try {
      await store.insertDay({
        userId: challenge.userId,
        challengeId: challenge.id,
        localDate: day.localDate,
        status: day.status,
        obligationsMet: day.obligationsMet,
        debtClosed: day.debtClosed,
        failureReason: day.failureReason,
        settledAt: now,
        streakAfter: day.streakAfter,
        bestStreakAfter: day.bestStreakAfter,
        xpBalanceAfter: day.xpBalanceAfter,
      });
    } catch (error) {
      if (error instanceof StoreConflict && error.constraint.includes('localDate')) continue;
      throw error;
    }

    for (const item of day.items) {
      await store.upsertDebtItem({
        userId: challenge.userId,
        challengeId: challenge.id,
        localDate: day.localDate,
        source: item.source,
        sourceId: item.sourceId,
        title: item.title,
        required: item.required,
        state: item.state,
        confirmedByUser: item.confirmedByUser,
        confirmedAt: item.confirmedByUser ? now : null,
        sortOrder: item.sortOrder,
      });
    }

    const written = new Set(day.items.map((item) => `${item.source}:${item.sourceId}`));
    const existing = await store.listDebtItems(challenge.id, day.localDate);
    for (const stale of existing) {
      if (written.has(`${stale.source}:${stale.sourceId}`)) continue;
      await store.updateDebtItem(stale.id, { state: 'not_applicable', required: false });
    }
  }

  for (const mutation of result.xpMutations) {
    const existing = await store.findTransactionByKey(challenge.userId, mutation.idempotencyKey);
    if (existing) continue;
    await store.insertTransaction({
      userId: challenge.userId,
      challengeId: challenge.id,
      amount: mutation.amount,
      lifetimeDelta: mutation.lifetimeDelta,
      reason: mutation.reason,
      balanceAfter: mutation.balanceAfter,
      earnedTotalAfter: mutation.earnedTotalAfter,
      idempotencyKey: mutation.idempotencyKey,
      localDate: mutation.localDate,
      sourceId: mutation.sourceId,
      activityLogId: null,
      purchaseId: null,
      note: mutation.reason === 'streak_reset' ? 'Сброс серии' : '',
    });
  }

  const unchanged =
    result.days.length === 0 &&
    result.state.status === challenge.status &&
    result.state.currentStreak === challenge.currentStreak &&
    result.state.bestStreak === challenge.bestStreak &&
    result.state.xpBalance === challenge.xpBalance &&
    result.state.xpEarnedTotal === challenge.xpEarnedTotal;

  if (unchanged) return challenge;

  return store.updateChallenge(challenge.id, {
    status: result.state.status,
    currentStreak: result.state.currentStreak,
    bestStreak: result.state.bestStreak,
    xpBalance: result.state.xpBalance,
    xpEarnedTotal: result.state.xpEarnedTotal,
  });
}

export interface OpenDay {
  localDate: string;
  evaluation: DayEvaluation;
  debt: DebtItemRecord[];
}

export async function syncOpenDay(store: AscentStore, challenge: ChallengeRecord, now: Date): Promise<OpenDay> {
  const localDate = formatLocalDate(now, challenge.timezone);
  const startsOn = formatLocalDate(challenge.startsAt, challenge.timezone);
  if (localDate < startsOn) {
    return {
      localDate,
      evaluation: evaluateDay({ streakAtStart: challenge.currentStreak, finalize: false }),
      debt: [],
    };
  }

  const snapshot = await loadObligations(store, challenge);
  const evaluation = evaluateSnapshot(snapshot, localDate, challenge.currentStreak, false);
  const existing = snapshot.debtItems.filter((item) => item.localDate === localDate);
  const seen = new Set<string>();

  for (const item of evaluation.items) {
    const key = `${item.source}:${item.sourceId}`;
    seen.add(key);
    const previous = existing.find((debt) => debt.source === item.source && debt.sourceId === item.sourceId);
    await store.upsertDebtItem({
      userId: challenge.userId,
      challengeId: challenge.id,
      localDate,
      source: item.source,
      sourceId: item.sourceId,
      title: item.title,
      required: item.required,
      state: item.state,
      confirmedByUser: item.confirmedByUser,
      confirmedAt: item.confirmedByUser ? (previous?.confirmedAt ?? now) : null,
      sortOrder: item.sortOrder,
    });
  }

  for (const stale of existing) {
    if (seen.has(`${stale.source}:${stale.sourceId}`)) continue;
    await store.updateDebtItem(stale.id, {
      state: 'not_applicable',
      required: false,
      confirmedByUser: false,
      confirmedAt: null,
    });
  }

  return {
    localDate,
    evaluation,
    debt: await store.listDebtItems(challenge.id, localDate),
  };
}

export async function lockOwned(
  store: AscentStore,
  userId: string,
  challengeId: string,
  now: Date
): Promise<ChallengeRecord> {
  const locked = await store.lockChallenge(userId, challengeId);
  if (!locked) throw new AscentRuleError('not_found');
  return persistSettlement(store, locked, now);
}

export async function lockActive(store: AscentStore, userId: string, now: Date): Promise<ChallengeRecord> {
  const active = await store.findActiveChallenge(userId);
  if (!active) throw new AscentRuleError('not_found');
  return lockOwned(store, userId, active.id, now);
}

export async function requireActive(
  store: AscentStore,
  userId: string,
  challengeId: string,
  now: Date
): Promise<ChallengeRecord> {
  const challenge = await lockOwned(store, userId, challengeId, now);
  if (challenge.status !== 'active') throw new AscentRuleError('challenge_not_active');
  return challenge;
}

export interface TodayPreview {
  status: DayEvaluation['status'];
  debtClosed: boolean;
  obligationsMet: boolean;
  failureReason: DayFailureReason | null;
}
