import {
  ASCENT_LIMITS,
  XP_UNITS,
  type RestrictionKind,
  type XpUnit,
} from '@/entities/ascent/model/types';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import { assertDailyHabitFrequency } from '@/shared/lib/ascent/habit-link';
import { ascentKey, assertClientIdempotencyKey } from '@/shared/lib/ascent/keys';
import { buildAbstinenceClock, canEditAbstinenceStart, optionalAbstinenceStart, type AscentClock } from '@/shared/lib/ascent/abstinence';
import { assertTimeZone, formatLocalDate } from '@/shared/lib/ascent/local-date';
import type { ChallengeRecord, DebtItemRecord, RestrictionRecord } from '@/shared/lib/ascent/records';
import {
  assertHabitOwner,
  assertImportance,
  assertRestrictionDraft,
  assertRewardBypassesRestriction,
  assertSingleActiveChallenge,
  assertTargetDays,
  assertTitle,
  coreBehaviorRestriction,
  isUnwantedBehaviorPreset,
  useRewardPermission,
  type RestrictionDraft,
} from '@/shared/lib/ascent/rules';
import {
  appliedKeys,
  captureChallenge,
  guard,
  lockActive,
  lockOwned,
  persistSettlement,
  requireActive,
  syncOpenDay,
  toAscentState,
  type TodayPreview,
} from '@/shared/lib/ascent/session';
import type { AscentStore } from '@/shared/lib/ascent/store';
import { assertActivityRule, purchaseReward, registerActivity, reverseActivityXp } from '@/shared/lib/ascent/xp';

const CREATE_LEDGER_FIELDS = [
  'currentStreak',
  'bestStreak',
  'xpBalance',
  'xpEarnedTotal',
  'status',
  'startsAt',
  'abstinenceStartedAt',
  'userId',
  'id',
] as const;

const UPDATE_LEDGER_FIELDS = [...CREATE_LEDGER_FIELDS, 'targetDays'] as const;

function bodyOf(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AscentRuleError('invalid_challenge');
  }
  return input as Record<string, unknown>;
}

function has(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function rejectFields(body: Record<string, unknown>, fields: readonly string[], code: AscentRuleError['code'] = 'invalid_challenge'): void {
  for (const field of fields) {
    if (has(body, field)) throw new AscentRuleError(code);
  }
}

function text(value: unknown, code: AscentRuleError['code'], max: number = ASCENT_LIMITS.descriptionMax): string {
  if (typeof value !== 'string') throw new AscentRuleError(code);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new AscentRuleError(code);
  return trimmed;
}

function optionalText(body: Record<string, unknown>, key: string, fallback: string): string {
  if (!has(body, key) || body[key] == null) return fallback;
  return text(body[key], 'invalid_challenge');
}

function readYears(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > ASCENT_LIMITS.yearsMax) {
    throw new AscentRuleError('invalid_challenge');
  }
  return value;
}

function readPreset(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !isUnwantedBehaviorPreset(value)) {
    throw new AscentRuleError('invalid_challenge');
  }
  return value;
}

function readSort(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new AscentRuleError('invalid_challenge');
  }
  return value;
}

function readBool(value: unknown, fallback: boolean, code: AscentRuleError['code'] = 'invalid_challenge'): boolean {
  if (value == null) return fallback;
  if (typeof value !== 'boolean') throw new AscentRuleError(code);
  return value;
}

function readUnit(value: unknown): XpUnit {
  if (typeof value !== 'string' || !(XP_UNITS as readonly string[]).includes(value)) {
    throw new AscentRuleError('invalid_activity_rule');
  }
  return value as XpUnit;
}

function readQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new AscentRuleError('invalid_quantity');
  return value;
}

function readCost(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new AscentRuleError('invalid_xp_cost');
  }
  return value;
}

function readUnlock(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new AscentRuleError('invalid_restriction');
  }
  return value;
}

function readKind(value: unknown): RestrictionKind {
  if (value == null) return 'custom';
  if (value === 'core_behavior') throw new AscentRuleError('invalid_restriction');
  if (value !== 'custom') throw new AscentRuleError('invalid_restriction');
  return 'custom';
}

async function challengeDetail(store: AscentStore, challenge: ChallengeRecord) {
  const [rewards, triggers, links, restrictions, customDebts, activities] = await Promise.all([
    store.listRewards(challenge.id),
    store.listTriggers(challenge.id),
    store.listHabitLinks(challenge.id),
    store.listRestrictions(challenge.id),
    store.listCustomDebts(challenge.id),
    store.listActivities(challenge.id),
  ]);
  const habitRows = await Promise.all(links.map((link) => store.findHabit(link.habitId)));
  const habits = links.map((link, index) => {
    const habit = habitRows[index];
    return {
      ...link,
      habit: habit
        ? {
            id: habit.id,
            name: habit.name,
            frequency: habit.frequency,
            trackingType: habit.trackingType,
            targetCount: habit.targetCount,
          }
        : null,
    };
  });

  return { challenge, rewards, triggers, habits, restrictions, customDebts, activities };
}

async function ownedReward(store: AscentStore, userId: string, challengeId: string, rewardId: string | null) {
  if (!rewardId) return null;
  const reward = await store.findReward(userId, rewardId);
  if (!reward || reward.challengeId !== challengeId) throw new AscentRuleError('invalid_restriction');
  return reward;
}

function draftFrom(current: RestrictionRecord, body: Record<string, unknown>): RestrictionDraft {
  const draft: RestrictionDraft = {
    title: has(body, 'title') ? assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax)) : current.title,
    description: optionalText(body, 'description', current.description),
    kind: has(body, 'kind') ? readKind(body.kind) : current.kind,
    unlockAfterSuccessfulDays: has(body, 'unlockAfterSuccessfulDays')
      ? readUnlock(body.unlockAfterSuccessfulDays)
      : current.unlockAfterSuccessfulDays,
    rewardId: has(body, 'rewardId') ? (body.rewardId == null ? null : text(body.rewardId, 'invalid_restriction', 40)) : current.rewardId,
    required: has(body, 'required') ? readBool(body.required, current.required, 'invalid_restriction') : current.required,
    bypassable: has(body, 'bypassable')
      ? readBool(body.bypassable, current.bypassable, 'invalid_restriction')
      : current.bypassable,
    active: has(body, 'active') ? readBool(body.active, current.active, 'invalid_restriction') : current.active,
    sortOrder: has(body, 'sortOrder') ? readSort(body.sortOrder, current.sortOrder) : current.sortOrder,
  };

  if (current.kind === 'core_behavior') {
    if (
      draft.kind !== 'core_behavior' ||
      draft.bypassable ||
      draft.rewardId ||
      !draft.required ||
      !draft.active ||
      draft.unlockAfterSuccessfulDays !== current.unlockAfterSuccessfulDays
    ) {
      throw new AscentRuleError('core_behavior_not_bypassable');
    }
  }

  assertRestrictionDraft(draft);
  return draft;
}

function activityRule(activity: {
  unit: XpUnit;
  xpPerGrant: number;
  quantityPerGrant: number;
  minQuantity: number;
  active: boolean;
}) {
  const rule = {
    unit: activity.unit,
    xpPerGrant: activity.xpPerGrant,
    quantityPerGrant: activity.quantityPerGrant,
    minQuantity: activity.minQuantity,
    active: activity.active,
  };
  assertActivityRule(rule);
  return rule;
}

export async function listChallenges(store: AscentStore, userId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const rows = await tx.listChallenges(userId);
      const challenges = [];
      for (const row of rows) {
        if (row.status !== 'active') {
          challenges.push(row);
          continue;
        }
        const locked = await tx.lockChallenge(userId, row.id);
        challenges.push(locked ? await persistSettlement(tx, locked, now) : row);
      }
      return { challenges };
    })
  );
}

export async function createChallenge(store: AscentStore, userId: string, input: unknown, now = new Date()) {
  const body = bodyOf(input);
  rejectFields(body, CREATE_LEDGER_FIELDS);
  const title = assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax));
  const unwantedBehavior = assertTitle(text(body.unwantedBehavior, 'invalid_title', ASCENT_LIMITS.titleMax));
  const importance = assertImportance(typeof body.importance === 'number' ? body.importance : Number.NaN);
  const targetDays = assertTargetDays(typeof body.targetDays === 'number' ? body.targetDays : Number.NaN);
  const timezone = assertTimeZone(typeof body.timezone === 'string' ? body.timezone : '');
  const description = optionalText(body, 'description', '');
  const behaviorPreset = has(body, 'behaviorPreset') ? readPreset(body.behaviorPreset) : null;
  const yearsStruggling = has(body, 'yearsStruggling') ? readYears(body.yearsStruggling) : null;
  const abstinenceStartedAt = optionalAbstinenceStart({
    now,
    timeZone: timezone,
    fallback: now,
    date: body.abstinenceDate,
    time: body.abstinenceTime,
    mentioned: has(body, 'abstinenceDate') || has(body, 'abstinenceTime'),
  });
  const core = coreBehaviorRestriction(unwantedBehavior);

  return store.transaction((tx) =>
    guard(async () => {
      const active = await tx.findActiveChallenge(userId);
      assertSingleActiveChallenge(active ? 1 : 0);
      const challenge = await tx.insertChallenge({
        userId,
        title,
        description,
        unwantedBehavior,
        behaviorPreset,
        yearsStruggling,
        importance,
        targetDays,
        startsAt: now,
        abstinenceStartedAt,
        timezone,
      });
      const restriction = await tx.insertRestriction({
        userId,
        challengeId: challenge.id,
        ...core,
      });
      return { challenge, restriction };
    })
  );
}

export async function getChallenge(store: AscentStore, userId: string, challengeId: string, now = new Date()) {
  return guard(async () => {
    const row = await store.findChallenge(userId, challengeId);
    if (!row) throw new AscentRuleError('not_found');
    if (row.status === 'active') {
      const captured = await captureChallenge(store, row, now);
      if (captured.settlementDirty) {
        return store.transaction((tx) =>
          guard(async () => {
            const challenge = await lockOwned(tx, userId, challengeId, now);
            return challengeDetail(tx, challenge);
          })
        );
      }
    } else if (row.status !== 'completed' && row.status !== 'archived') {
      throw new AscentRuleError('challenge_not_active');
    }
    return challengeDetail(store, row);
  });
}

export async function updateChallenge(store: AscentStore, userId: string, challengeId: string, input: unknown, now = new Date()) {
  const body = bodyOf(input);
  rejectFields(body, UPDATE_LEDGER_FIELDS);
  if (has(body, 'timezone')) throw new AscentRuleError('timezone_locked');

  const mentionsAbstinence = has(body, 'abstinenceDate') || has(body, 'abstinenceTime');

  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await lockOwned(tx, userId, challengeId, now);
      if (challenge.status === 'archived') throw new AscentRuleError('challenge_not_active');
      let abstinenceStartedAt: Date | undefined;
      if (mentionsAbstinence) {
        const today = formatLocalDate(now, challenge.timezone);
        const [days, transactions, debt] = await Promise.all([
          tx.listDays(challenge.id),
          tx.listTransactions(challenge.id),
          tx.listDebtItems(challenge.id, today),
        ]);
        const editable = canEditAbstinenceStart({
          status: challenge.status,
          currentStreak: challenge.currentStreak,
          bestStreak: challenge.bestStreak,
          hasFailedDay: days.some((day) => day.status === 'failed'),
          hasStreakReset: transactions.some((item) => item.reason === 'streak_reset'),
          openViolation: debt.some((item) => item.source === 'restriction' && item.state === 'missed'),
        });
        if (!editable) throw new AscentRuleError('abstinence_start_locked');
        abstinenceStartedAt = optionalAbstinenceStart({
          now,
          timeZone: challenge.timezone,
          fallback: challenge.abstinenceStartedAt,
          date: body.abstinenceDate,
          time: body.abstinenceTime,
          mentioned: true,
        });
      }
      let updated = await tx.updateChallenge(challenge.id, {
        title: has(body, 'title') ? assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax)) : challenge.title,
        description: optionalText(body, 'description', challenge.description),
        unwantedBehavior: has(body, 'unwantedBehavior')
          ? assertTitle(text(body.unwantedBehavior, 'invalid_title', ASCENT_LIMITS.titleMax))
          : challenge.unwantedBehavior,
        behaviorPreset: has(body, 'behaviorPreset') ? readPreset(body.behaviorPreset) : challenge.behaviorPreset,
        yearsStruggling: has(body, 'yearsStruggling') ? readYears(body.yearsStruggling) : challenge.yearsStruggling,
        importance: has(body, 'importance')
          ? assertImportance(typeof body.importance === 'number' ? body.importance : Number.NaN)
          : challenge.importance,
        ...(abstinenceStartedAt ? { abstinenceStartedAt } : {}),
      });
      if (
        abstinenceStartedAt &&
        abstinenceStartedAt.getTime() !== challenge.abstinenceStartedAt.getTime()
      ) {
        updated = await persistSettlement(tx, updated, now);
      }
      return { challenge: updated };
    })
  );
}

export async function archiveChallenge(store: AscentStore, userId: string, challengeId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await lockOwned(tx, userId, challengeId, now);
      if (challenge.status === 'archived') return { challenge };
      return { challenge: await tx.updateChallenge(challenge.id, { status: 'archived' }) };
    })
  );
}

export async function listHabitLinks(store: AscentStore, userId: string, challengeId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await lockOwned(tx, userId, challengeId, now);
      return { habits: (await challengeDetail(tx, challenge)).habits };
    })
  );
}

export async function linkHabit(store: AscentStore, userId: string, challengeId: string, input: unknown, now = new Date()) {
  const body = bodyOf(input);
  if (has(body, 'completionRule') && body.completionRule !== 'as_habit') {
    throw new AscentRuleError('invalid_challenge');
  }
  const habitId = text(body.habitId, 'invalid_challenge', 40);

  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const habit = await tx.findHabit(habitId);
      if (!habit) throw new AscentRuleError('not_found');
      assertHabitOwner(habit.userId, userId);
      assertDailyHabitFrequency(habit.frequency);
      const link = await tx.insertHabitLink({
        userId,
        challengeId: challenge.id,
        habitId: habit.id,
        required: has(body, 'required') ? readBool(body.required, true) : true,
        sortOrder: has(body, 'sortOrder') ? readSort(body.sortOrder) : 0,
        completionRule: 'as_habit',
      });
      await syncOpenDay(tx, challenge, now);
      return { link };
    })
  );
}

export async function unlinkHabit(store: AscentStore, userId: string, challengeId: string, linkId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const link = await tx.findHabitLink(userId, linkId);
      if (!link || link.challengeId !== challenge.id) throw new AscentRuleError('not_found');
      await tx.deleteHabitLink(link.id);
      await syncOpenDay(tx, challenge, now);
      return { ok: true as const };
    })
  );
}

export async function listRewards(store: AscentStore, userId: string, challengeId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await lockOwned(tx, userId, challengeId, now);
      return { rewards: await tx.listRewards(challenge.id) };
    })
  );
}

export async function createReward(store: AscentStore, userId: string, challengeId: string, input: unknown, now = new Date()) {
  const body = bodyOf(input);
  rejectFields(body, ['xpBalance', 'attractiveness']);
  const title = assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax));
  const xpCost = readCost(body.xpCost);

  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const reward = await tx.insertReward({
        userId,
        challengeId: challenge.id,
        title,
        description: optionalText(body, 'description', ''),
        icon: has(body, 'icon') && body.icon != null ? text(body.icon, 'invalid_challenge', 40) : null,
        xpCost,
        active: has(body, 'active') ? readBool(body.active, true) : true,
        available: has(body, 'available') ? readBool(body.available, true) : true,
        sortOrder: has(body, 'sortOrder') ? readSort(body.sortOrder) : 0,
      });
      return { reward };
    })
  );
}

export async function updateReward(
  store: AscentStore,
  userId: string,
  challengeId: string,
  rewardId: string,
  input: unknown,
  now = new Date()
) {
  const body = bodyOf(input);
  rejectFields(body, ['xpBalance', 'attractiveness']);

  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const current = await tx.findReward(userId, rewardId);
      if (!current || current.challengeId !== challenge.id) throw new AscentRuleError('not_found');
      const reward = await tx.updateReward(current.id, {
        title: has(body, 'title') ? assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax)) : current.title,
        description: optionalText(body, 'description', current.description),
        icon: has(body, 'icon') ? (body.icon == null ? null : text(body.icon, 'invalid_challenge', 40)) : current.icon,
        xpCost: has(body, 'xpCost') ? readCost(body.xpCost) : current.xpCost,
        active: has(body, 'active') ? readBool(body.active, current.active) : current.active,
        available: has(body, 'available') ? readBool(body.available, current.available) : current.available,
        sortOrder: has(body, 'sortOrder') ? readSort(body.sortOrder, current.sortOrder) : current.sortOrder,
      });
      return { reward };
    })
  );
}

export async function deleteReward(store: AscentStore, userId: string, challengeId: string, rewardId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const current = await tx.findReward(userId, rewardId);
      if (!current || current.challengeId !== challenge.id) throw new AscentRuleError('not_found');
      await tx.deleteReward(current.id);
      return { ok: true as const };
    })
  );
}

export async function listTriggers(store: AscentStore, userId: string, challengeId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await lockOwned(tx, userId, challengeId, now);
      return { triggers: await tx.listTriggers(challenge.id) };
    })
  );
}

export async function createTrigger(store: AscentStore, userId: string, challengeId: string, input: unknown, now = new Date()) {
  const body = bodyOf(input);
  const title = assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax));

  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const trigger = await tx.insertTrigger({
        userId,
        challengeId: challenge.id,
        title,
        description: optionalText(body, 'description', ''),
        sortOrder: has(body, 'sortOrder') ? readSort(body.sortOrder) : 0,
      });
      return { trigger };
    })
  );
}

export async function updateTrigger(
  store: AscentStore,
  userId: string,
  challengeId: string,
  triggerId: string,
  input: unknown,
  now = new Date()
) {
  const body = bodyOf(input);
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const current = await tx.findTrigger(userId, triggerId);
      if (!current || current.challengeId !== challenge.id) throw new AscentRuleError('not_found');
      const trigger = await tx.updateTrigger(current.id, {
        title: has(body, 'title') ? assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax)) : current.title,
        description: optionalText(body, 'description', current.description),
        sortOrder: has(body, 'sortOrder') ? readSort(body.sortOrder, current.sortOrder) : current.sortOrder,
      });
      return { trigger };
    })
  );
}

export async function deleteTrigger(store: AscentStore, userId: string, challengeId: string, triggerId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const current = await tx.findTrigger(userId, triggerId);
      if (!current || current.challengeId !== challenge.id) throw new AscentRuleError('not_found');
      await tx.deleteTrigger(current.id);
      return { ok: true as const };
    })
  );
}

export async function listRestrictions(store: AscentStore, userId: string, challengeId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await lockOwned(tx, userId, challengeId, now);
      return { restrictions: await tx.listRestrictions(challenge.id) };
    })
  );
}

export async function createRestriction(store: AscentStore, userId: string, challengeId: string, input: unknown, now = new Date()) {
  const body = bodyOf(input);
  const draft: RestrictionDraft = {
    title: assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax)),
    description: optionalText(body, 'description', ''),
    kind: readKind(body.kind),
    unlockAfterSuccessfulDays: readUnlock(body.unlockAfterSuccessfulDays),
    rewardId: body.rewardId == null ? null : text(body.rewardId, 'invalid_restriction', 40),
    required: readBool(body.required, true, 'invalid_restriction'),
    bypassable: readBool(body.bypassable, false, 'invalid_restriction'),
    active: readBool(body.active, true, 'invalid_restriction'),
    sortOrder: readSort(body.sortOrder),
  };
  assertRestrictionDraft(draft);

  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      await ownedReward(tx, userId, challenge.id, draft.rewardId);
      const restriction = await tx.insertRestriction({ userId, challengeId: challenge.id, ...draft });
      await syncOpenDay(tx, challenge, now);
      return { restriction };
    })
  );
}

export async function updateRestriction(
  store: AscentStore,
  userId: string,
  challengeId: string,
  restrictionId: string,
  input: unknown,
  now = new Date()
) {
  const body = bodyOf(input);
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const current = await tx.findRestriction(userId, restrictionId);
      if (!current || current.challengeId !== challenge.id) throw new AscentRuleError('not_found');
      const draft = draftFrom(current, body);
      await ownedReward(tx, userId, challenge.id, draft.rewardId);
      const restriction = await tx.updateRestriction(current.id, draft);
      await syncOpenDay(tx, challenge, now);
      return { restriction };
    })
  );
}

export async function deleteRestriction(
  store: AscentStore,
  userId: string,
  challengeId: string,
  restrictionId: string,
  now = new Date()
) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const current = await tx.findRestriction(userId, restrictionId);
      if (!current || current.challengeId !== challenge.id) throw new AscentRuleError('not_found');
      if (current.kind === 'core_behavior') throw new AscentRuleError('core_behavior_required');
      await tx.deleteRestriction(current.id);
      await syncOpenDay(tx, challenge, now);
      return { ok: true as const };
    })
  );
}

export async function recordViolation(
  store: AscentStore,
  userId: string,
  challengeId: string,
  restrictionId: string,
  now = new Date()
) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const restriction = await tx.findRestriction(userId, restrictionId);
      if (!restriction || restriction.challengeId !== challenge.id) throw new AscentRuleError('not_found');
      const open = await syncOpenDay(tx, challenge, now);
      const item = open.debt.find((debt) => debt.source === 'restriction' && debt.sourceId === restriction.id);
      if (!item || item.state === 'not_applicable') throw new AscentRuleError('invalid_restriction');
      if (item.state === 'missed' && item.confirmedByUser) return { debt: item, replayed: true };
      const debt = await tx.updateDebtItem(item.id, {
        state: 'missed',
        confirmedByUser: true,
        confirmedAt: now,
      });
      return { debt, replayed: false };
    })
  );
}

export async function listCustomDebts(store: AscentStore, userId: string, challengeId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await lockOwned(tx, userId, challengeId, now);
      return { customDebts: await tx.listCustomDebts(challenge.id) };
    })
  );
}

export async function createCustomDebt(store: AscentStore, userId: string, challengeId: string, input: unknown, now = new Date()) {
  const body = bodyOf(input);
  const title = assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax));
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const customDebt = await tx.insertCustomDebt({
        userId,
        challengeId: challenge.id,
        title,
        description: optionalText(body, 'description', ''),
        required: has(body, 'required') ? readBool(body.required, true) : true,
        active: has(body, 'active') ? readBool(body.active, true) : true,
        sortOrder: has(body, 'sortOrder') ? readSort(body.sortOrder) : 0,
      });
      await syncOpenDay(tx, challenge, now);
      return { customDebt };
    })
  );
}

export async function updateCustomDebt(
  store: AscentStore,
  userId: string,
  challengeId: string,
  debtId: string,
  input: unknown,
  now = new Date()
) {
  const body = bodyOf(input);
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const current = await tx.findCustomDebt(userId, debtId);
      if (!current || current.challengeId !== challenge.id) throw new AscentRuleError('not_found');
      const customDebt = await tx.updateCustomDebt(current.id, {
        title: has(body, 'title') ? assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax)) : current.title,
        description: optionalText(body, 'description', current.description),
        required: has(body, 'required') ? readBool(body.required, current.required) : current.required,
        active: has(body, 'active') ? readBool(body.active, current.active) : current.active,
        sortOrder: has(body, 'sortOrder') ? readSort(body.sortOrder, current.sortOrder) : current.sortOrder,
      });
      await syncOpenDay(tx, challenge, now);
      return { customDebt };
    })
  );
}

export async function deleteCustomDebt(store: AscentStore, userId: string, challengeId: string, debtId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const current = await tx.findCustomDebt(userId, debtId);
      if (!current || current.challengeId !== challenge.id) throw new AscentRuleError('not_found');
      await tx.deleteCustomDebt(current.id);
      await syncOpenDay(tx, challenge, now);
      return { ok: true as const };
    })
  );
}

async function resolveChallenge(store: AscentStore, userId: string, challengeId: string | null, now: Date) {
  if (challengeId) return lockOwned(store, userId, challengeId, now);
  return lockActive(store, userId, now);
}

export async function listActivities(store: AscentStore, userId: string, challengeId: string | null, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await resolveChallenge(tx, userId, challengeId, now);
      return { challengeId: challenge.id, activities: await tx.listActivities(challenge.id) };
    })
  );
}

export async function createActivity(
  store: AscentStore,
  userId: string,
  challengeId: string | null,
  input: unknown,
  now = new Date()
) {
  const body = bodyOf(input);
  rejectFields(body, ['xpBalance', 'xp']);
  const title = assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax));
  const actionType = text(body.actionType, 'invalid_activity_rule', 80);
  if (!actionType) throw new AscentRuleError('invalid_activity_rule');
  const rule = activityRule({
    unit: readUnit(body.unit),
    xpPerGrant: typeof body.xpPerGrant === 'number' ? body.xpPerGrant : Number.NaN,
    quantityPerGrant: typeof body.quantityPerGrant === 'number' ? body.quantityPerGrant : Number.NaN,
    minQuantity: body.minQuantity == null ? 0 : readQuantity(body.minQuantity),
    active: has(body, 'active') ? readBool(body.active, true, 'invalid_activity_rule') : true,
  });
  const requestedChallenge = challengeId ?? (typeof body.challengeId === 'string' ? body.challengeId : null);

  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await resolveChallenge(tx, userId, requestedChallenge, now);
      if (challenge.status !== 'active') throw new AscentRuleError('challenge_not_active');
      const activity = await tx.insertActivity({
        userId,
        challengeId: challenge.id,
        title,
        actionType,
        ...rule,
        sortOrder: has(body, 'sortOrder') ? readSort(body.sortOrder) : 0,
      });
      return { activity };
    })
  );
}

export async function updateActivity(store: AscentStore, userId: string, activityId: string, input: unknown, now = new Date()) {
  const body = bodyOf(input);
  rejectFields(body, ['xpBalance', 'xp', 'challengeId']);
  return store.transaction((tx) =>
    guard(async () => {
      const current = await tx.findActivity(userId, activityId);
      if (!current) throw new AscentRuleError('not_found');
      const challenge = await requireActive(tx, userId, current.challengeId, now);
      const rule = activityRule({
        unit: has(body, 'unit') ? readUnit(body.unit) : current.unit,
        xpPerGrant: has(body, 'xpPerGrant') && typeof body.xpPerGrant === 'number' ? body.xpPerGrant : current.xpPerGrant,
        quantityPerGrant: has(body, 'quantityPerGrant') && typeof body.quantityPerGrant === 'number'
          ? body.quantityPerGrant
          : current.quantityPerGrant,
        minQuantity: has(body, 'minQuantity') ? readQuantity(body.minQuantity) : current.minQuantity,
        active: has(body, 'active') ? readBool(body.active, current.active, 'invalid_activity_rule') : current.active,
      });
      const activity = await tx.updateActivity(current.id, {
        title: has(body, 'title') ? assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax)) : current.title,
        actionType: has(body, 'actionType') ? text(body.actionType, 'invalid_activity_rule', 80) : current.actionType,
        sortOrder: has(body, 'sortOrder') ? readSort(body.sortOrder, current.sortOrder) : current.sortOrder,
        ...rule,
      });
      void challenge;
      return { activity };
    })
  );
}

export async function earnXp(store: AscentStore, userId: string, input: unknown, now = new Date()) {
  const body = bodyOf(input);
  rejectFields(body, ['xp', 'xpBalance', 'amount', 'currentStreak', 'bestStreak']);
  const activityId = text(body.activityId, 'invalid_activity_rule', 40);
  const quantity = readQuantity(body.quantity);
  const idempotencyKey = assertClientIdempotencyKey(typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '');

  return store.transaction((tx) =>
    guard(async () => {
      const activity = await tx.findActivity(userId, activityId);
      if (!activity) throw new AscentRuleError('not_found');
      if (typeof body.challengeId === 'string' && body.challengeId !== activity.challengeId) {
        throw new AscentRuleError('not_found');
      }
      const challenge = await requireActive(tx, userId, activity.challengeId, now);
      const [keys, days] = await Promise.all([appliedKeys(tx, challenge.id), tx.listDays(challenge.id)]);
      const today = formatLocalDate(now, challenge.timezone);
      const result = registerActivity({
        state: toAscentState(challenge, keys),
        challengeId: challenge.id,
        today,
        settledDates: days.map((day) => day.localDate),
        localDate: today,
        rule: activityRule(activity),
        quantity,
        idempotencyKey,
        sourceId: activity.id,
      });

      if (result.replayed || !result.mutation) {
        const log = await tx.findActivityLogByKey(userId, ascentKey(challenge.id, `activity:${idempotencyKey}`));
        return { replayed: true, xp: log?.xpGranted ?? 0, challenge, log, transaction: null };
      }

      const log = await tx.insertActivityLog({
        userId,
        challengeId: challenge.id,
        activityId: activity.id,
        localDate: today,
        quantity,
        xpGranted: result.xp,
        idempotencyKey: result.mutation.idempotencyKey,
      });
      const transaction = await tx.insertTransaction({
        userId,
        challengeId: challenge.id,
        amount: result.mutation.amount,
        lifetimeDelta: result.mutation.lifetimeDelta,
        reason: result.mutation.reason,
        balanceAfter: result.mutation.balanceAfter,
        earnedTotalAfter: result.mutation.earnedTotalAfter,
        idempotencyKey: result.mutation.idempotencyKey,
        localDate: result.mutation.localDate,
        sourceId: activity.id,
        activityLogId: log.id,
        purchaseId: null,
        note: activity.title,
      });
      const updated = await tx.updateChallenge(challenge.id, {
        xpBalance: result.state.xpBalance,
        xpEarnedTotal: result.state.xpEarnedTotal,
      });
      return { replayed: false, xp: result.xp, challenge: updated, log, transaction };
    })
  );
}

export async function reverseActivity(store: AscentStore, userId: string, challengeId: string, logId: string, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const log = await tx.findActivityLog(userId, logId);
      if (!log || log.challengeId !== challengeId) throw new AscentRuleError('not_found');
      const challenge = await requireActive(tx, userId, challengeId, now);
      const today = formatLocalDate(now, challenge.timezone);
      if (log.localDate !== today) throw new AscentRuleError('day_already_closed');
      const keys = await appliedKeys(tx, challenge.id);
      const result = reverseActivityXp({
        state: toAscentState(challenge, keys),
        challengeId: challenge.id,
        logId: log.id,
        xpGranted: log.xpGranted,
        localDate: log.localDate,
        alreadyReversed: log.reversedAt != null,
      });
      if (result.replayed) {
        return { replayed: true, challenge, log };
      }
      const reversed = await tx.markActivityLogReversed(log.id, now);
      const transaction = result.mutation
        ? await tx.insertTransaction({
        userId,
        challengeId: challenge.id,
        amount: result.mutation.amount,
        lifetimeDelta: result.mutation.lifetimeDelta,
        reason: result.mutation.reason,
        balanceAfter: result.mutation.balanceAfter,
        earnedTotalAfter: result.mutation.earnedTotalAfter,
        idempotencyKey: result.mutation.idempotencyKey,
        localDate: result.mutation.localDate,
        sourceId: log.id,
        activityLogId: log.id,
        purchaseId: null,
        note: 'Отмена начисления',
      })
        : null;
      const updated = await tx.updateChallenge(challenge.id, {
        xpBalance: result.state.xpBalance,
        xpEarnedTotal: result.state.xpEarnedTotal,
      });
      return { replayed: false, challenge: updated, log: reversed, transaction };
    })
  );
}

async function bypassTarget(store: AscentStore, userId: string, challengeId: string, rewardId: string, requested: unknown) {
  const restrictions = await store.listRestrictions(challengeId);
  const linked = restrictions.filter((item) => item.rewardId === rewardId);
  const restrictionId = typeof requested === 'string' ? requested : null;
  const restriction = restrictionId
    ? restrictions.find((item) => item.id === restrictionId) ?? null
    : linked.length === 1
      ? linked[0]
      : null;

  if (restrictionId && !restriction) throw new AscentRuleError('invalid_restriction');
  if (!restrictionId && linked.length > 1) throw new AscentRuleError('reward_link_requires_bypass');
  if (!restriction) return { restrictionId: null as string | null, grantsBypass: false };

  assertRewardBypassesRestriction(restriction, rewardId);
  await ownedReward(store, userId, challengeId, rewardId);
  return { restrictionId: restriction.id, grantsBypass: true };
}

export async function purchaseRewardXp(
  store: AscentStore,
  userId: string,
  rewardId: string,
  input: unknown,
  now = new Date()
) {
  const body = bodyOf(input);
  rejectFields(body, ['xpBalance', 'xpSpent', 'xpCost']);
  const idempotencyKey = assertClientIdempotencyKey(typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '');

  return store.transaction((tx) =>
    guard(async () => {
      const reward = await tx.findReward(userId, rewardId);
      if (!reward) throw new AscentRuleError('not_found');
      if (typeof body.challengeId === 'string' && body.challengeId !== reward.challengeId) {
        throw new AscentRuleError('not_found');
      }
      const challenge = await requireActive(tx, userId, reward.challengeId, now);
      const [keys, days] = await Promise.all([appliedKeys(tx, challenge.id), tx.listDays(challenge.id)]);
      const today = formatLocalDate(now, challenge.timezone);
      const bypass = await bypassTarget(tx, userId, challenge.id, reward.id, body.restrictionId);
      const result = purchaseReward({
        state: toAscentState(challenge, keys),
        challengeId: challenge.id,
        xpCost: reward.xpCost,
        active: reward.active,
        available: reward.available,
        localDate: today,
        today,
        settledDates: days.map((day) => day.localDate),
        idempotencyKey,
        sourceId: reward.id,
      });

      if (result.replayed) {
        const purchase = await tx.findPurchaseByKey(userId, ascentKey(challenge.id, `purchase:${idempotencyKey}`));
        return { replayed: true, xpSpent: purchase?.xpSpent ?? 0, challenge, purchase };
      }

      const purchase = await tx.insertPurchase({
        userId,
        challengeId: challenge.id,
        rewardId: reward.id,
        restrictionId: bypass.restrictionId,
        xpSpent: result.xpSpent,
        grantsBypass: bypass.grantsBypass,
        idempotencyKey: ascentKey(challenge.id, `purchase:${idempotencyKey}`),
        purchasedAt: now,
      });
      const transaction = result.mutation
        ? await tx.insertTransaction({
            userId,
            challengeId: challenge.id,
            amount: result.mutation.amount,
            lifetimeDelta: result.mutation.lifetimeDelta,
            reason: result.mutation.reason,
            balanceAfter: result.mutation.balanceAfter,
            earnedTotalAfter: result.mutation.earnedTotalAfter,
            idempotencyKey: result.mutation.idempotencyKey,
            localDate: result.mutation.localDate,
            sourceId: reward.id,
            activityLogId: null,
            purchaseId: purchase.id,
            note: reward.title,
          })
        : null;
      const updated = await tx.updateChallenge(challenge.id, { xpBalance: result.state.xpBalance });
      return { replayed: false, xpSpent: result.xpSpent, challenge: updated, purchase, transaction };
    })
  );
}

export async function useRewardPurchase(
  store: AscentStore,
  userId: string,
  challengeId: string,
  purchaseId: string,
  now = new Date()
) {
  return store.transaction((tx) =>
    guard(async () => {
      const purchase = await tx.findPurchase(userId, purchaseId);
      if (!purchase || purchase.challengeId !== challengeId) throw new AscentRuleError('not_found');
      const challenge = await requireActive(tx, userId, challengeId, now);
      const today = formatLocalDate(now, challenge.timezone);
      const days = await tx.listDays(challenge.id);
      if (days.some((day) => day.localDate === today)) throw new AscentRuleError('day_already_closed');
      const next = useRewardPermission(purchase, today);
      const used = next.replayed ? purchase : await tx.markPermissionUsed(purchase.id, today, now);
      await syncOpenDay(tx, challenge, now);
      return { purchase: used, replayed: next.replayed };
    })
  );
}

export async function listXpTransactions(store: AscentStore, userId: string, challengeId: string | null, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await resolveChallenge(tx, userId, challengeId, now);
      return {
        challengeId: challenge.id,
        xpBalance: challenge.xpBalance,
        xpEarnedTotal: challenge.xpEarnedTotal,
        transactions: await tx.listTransactions(challenge.id),
      };
    })
  );
}

export async function listRewardPurchases(store: AscentStore, userId: string, challengeId: string | null, now = new Date()) {
  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await resolveChallenge(tx, userId, challengeId, now);
      const [purchases, rewards] = await Promise.all([tx.listPurchases(challenge.id), tx.listRewards(challenge.id)]);
      return {
        challengeId: challenge.id,
        purchases: purchases.map((purchase) => ({
          ...purchase,
          rewardTitle: rewards.find((reward) => reward.id === purchase.rewardId)?.title ?? '',
        })),
      };
    })
  );
}

function clockFromDays(
  challenge: ChallengeRecord,
  days: readonly { localDate: string; status: string }[],
  now: Date,
  openDayFailed: boolean
): AscentClock {
  return buildAbstinenceClock({
    startsAt: challenge.startsAt,
    abstinenceStartedAt: challenge.abstinenceStartedAt,
    timezone: challenge.timezone,
    status: challenge.status,
    now,
    failedLocalDates: days.filter((day) => day.status === 'failed').map((day) => day.localDate),
    successfulLocalDates: days.filter((day) => day.status === 'successful').map((day) => day.localDate),
    openDayFailed,
  });
}

export async function getToday(store: AscentStore, userId: string, now = new Date()) {
  return guard(async () => {
    const active = await store.findActiveChallenge(userId);
    if (!active) throw new AscentRuleError('not_found');
    const captured = await captureChallenge(store, active, now);
    if (!captured.settlementDirty && !captured.openDirty && captured.open) {
      return {
        challenge: active,
        localDate: captured.open.localDate,
        currentStreak: active.currentStreak,
        bestStreak: active.bestStreak,
        xpBalance: active.xpBalance,
        xpEarnedTotal: active.xpEarnedTotal,
        debt: captured.open.debt,
        restrictions: captured.graph.restrictions.filter((item) => item.active),
        preview: {
          status: captured.open.evaluation.status,
          debtClosed: captured.open.evaluation.debtClosed,
          obligationsMet: captured.open.evaluation.obligationsMet,
          failureReason: captured.open.evaluation.failureReason,
        },
        clock: clockFromDays(active, captured.graph.days, now, captured.open.evaluation.status === 'failed'),
      };
    }
    return store.transaction((tx) => loadToday(tx, userId, now));
  });
}

async function loadToday(store: AscentStore, userId: string, now: Date) {
  return guard(async () => {
    const active = await store.findActiveChallenge(userId);
    if (!active) throw new AscentRuleError('not_found');
    const challenge = await lockOwned(store, userId, active.id, now);
    const restrictions = (await store.listRestrictions(challenge.id)).filter((item) => item.active);
    if (challenge.status !== 'active') {
      const localDate = formatLocalDate(now, challenge.timezone);
      const preview: TodayPreview = {
        status: 'pending',
        debtClosed: true,
        obligationsMet: true,
        failureReason: null,
      };
      return {
        challenge,
        localDate,
        currentStreak: challenge.currentStreak,
        bestStreak: challenge.bestStreak,
        xpBalance: challenge.xpBalance,
        xpEarnedTotal: challenge.xpEarnedTotal,
        debt: [] as DebtItemRecord[],
        restrictions,
        preview,
        clock: clockFromDays(challenge, await store.listDays(challenge.id), now, false),
      };
    }

    const open = await syncOpenDay(store, challenge, now);
    return {
      challenge,
      localDate: open.localDate,
      currentStreak: challenge.currentStreak,
      bestStreak: challenge.bestStreak,
      xpBalance: challenge.xpBalance,
      xpEarnedTotal: challenge.xpEarnedTotal,
      debt: open.debt,
      restrictions,
      preview: {
        status: open.evaluation.status,
        debtClosed: open.evaluation.debtClosed,
        obligationsMet: open.evaluation.obligationsMet,
        failureReason: open.evaluation.failureReason,
      },
      clock: clockFromDays(challenge, await store.listDays(challenge.id), now, open.evaluation.status === 'failed'),
    };
  });
}

export async function getHistory(store: AscentStore, userId: string, challengeId: string | null, now = new Date()) {
  return guard(async () => {
    const row = challengeId ? await store.findChallenge(userId, challengeId) : await store.findActiveChallenge(userId);
    if (!row) throw new AscentRuleError('not_found');
    const captured = await captureChallenge(store, row, now);
    if (!captured.settlementDirty && !captured.openDirty) {
      const openDayFailed =
        row.status === 'active' &&
        now.getTime() >= row.startsAt.getTime() &&
        captured.open?.evaluation.status === 'failed';
      return {
        challenge: row,
        localDate: formatLocalDate(now, row.timezone),
        clock: clockFromDays(row, captured.graph.days, now, openDayFailed),
        days: captured.graph.days.map((day) => ({
          ...day,
          debt: captured.graph.debtItems.filter((item) => item.localDate === day.localDate),
        })),
      };
    }
    return store.transaction((tx) =>
      guard(async () => {
        const challenge = await resolveChallenge(tx, userId, challengeId, now);
        let openDayFailed = false;
        if (challenge.status === 'active' && now.getTime() >= challenge.startsAt.getTime()) {
          const open = await syncOpenDay(tx, challenge, now);
          openDayFailed = open.evaluation.status === 'failed';
        }
        const days = await tx.listDays(challenge.id);
        const debt = await tx.listDebtItems(challenge.id);
        return {
          challenge,
          localDate: formatLocalDate(now, challenge.timezone),
          clock: clockFromDays(challenge, days, now, openDayFailed),
          days: days.map((day) => ({
            ...day,
            debt: debt.filter((item) => item.localDate === day.localDate),
          })),
        };
      })
    );
  });
}

async function writeManualDebt(store: AscentStore, userId: string, item: DebtItemRecord, confirmed: boolean, now: Date) {
  if (item.source === 'habit') throw new AscentRuleError('debt_not_manual');
  if (item.state === 'bypassed') throw new AscentRuleError('permission_already_used');
  if (item.state === 'missed' && item.confirmedByUser) throw new AscentRuleError('violation_locked');
  if (item.state === 'not_applicable') throw new AscentRuleError('invalid_restriction');
  return store.updateDebtItem(item.id, {
    state: confirmed ? 'satisfied' : 'pending',
    confirmedByUser: confirmed,
    confirmedAt: confirmed ? now : null,
  });
}

export async function setDebtConfirmation(store: AscentStore, userId: string, debtItemId: string, input: unknown, now = new Date()) {
  const body = bodyOf(input);
  const confirmed = body.confirmed;
  if (typeof confirmed !== 'boolean') throw new AscentRuleError('invalid_challenge');

  return store.transaction((tx) =>
    guard(async () => {
      const current = await tx.findDebtItem(userId, debtItemId);
      if (!current) throw new AscentRuleError('not_found');
      const challenge = await requireActive(tx, userId, current.challengeId, now);
      const today = formatLocalDate(now, challenge.timezone);
      const fresh = await tx.findDebtItem(userId, debtItemId);
      if (!fresh || fresh.localDate !== today) throw new AscentRuleError('day_already_closed');
      const closed = await tx.findDay(challenge.id, today);
      if (closed && closed.status !== 'pending') throw new AscentRuleError('day_already_closed');
      const debt = await writeManualDebt(tx, userId, fresh, confirmed, now);
      return { debt };
    })
  );
}

export async function confirmDebtBatch(
  store: AscentStore,
  userId: string,
  challengeId: string,
  localDate: string,
  input: unknown,
  now = new Date()
) {
  const body = bodyOf(input);
  const items = body.items;
  if (!Array.isArray(items)) throw new AscentRuleError('invalid_challenge');

  return store.transaction((tx) =>
    guard(async () => {
      const challenge = await requireActive(tx, userId, challengeId, now);
      const today = formatLocalDate(now, challenge.timezone);
      if (localDate !== today) throw new AscentRuleError('day_already_closed');
      const open = await syncOpenDay(tx, challenge, now);
      const updated = [];
      for (const entry of items) {
        const itemBody = bodyOf(entry);
        const source = itemBody.source;
        const sourceId = typeof itemBody.sourceId === 'string' ? itemBody.sourceId : '';
        const confirmed = itemBody.confirmed;
        if (source !== 'restriction' && source !== 'custom') throw new AscentRuleError('debt_not_manual');
        if (typeof confirmed !== 'boolean') throw new AscentRuleError('invalid_challenge');
        const match = open.debt.find((debt) => debt.source === source && debt.sourceId === sourceId);
        if (!match) throw new AscentRuleError('not_found');
        updated.push(await writeManualDebt(tx, userId, match, confirmed, now));
      }
      return { debt: updated };
    })
  );
}
