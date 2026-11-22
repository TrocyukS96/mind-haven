import {
  ASCENT_LIMITS,
  XP_UNITS,
  type XpUnit,
} from '@/entities/ascent/model/types';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import { optionalAbstinenceStart } from '@/shared/lib/ascent/abstinence';
import { assertDailyHabitFrequency } from '@/shared/lib/ascent/habit-link';
import { assertClientIdempotencyKey } from '@/shared/lib/ascent/keys';
import { assertTimeZone, resolveChallengeStartsAt } from '@/shared/lib/ascent/local-date';
import {
  assertHabitOwner,
  assertImportance,
  assertRestrictionDraft,
  assertTargetDays,
  assertTitle,
  coreBehaviorRestriction,
  isUnwantedBehaviorPreset,
  type RestrictionDraft,
} from '@/shared/lib/ascent/rules';
import { rethrowStore, syncOpenDay } from '@/shared/lib/ascent/session';
import type { AscentStore } from '@/shared/lib/ascent/store';
import { assertActivityRule } from '@/shared/lib/ascent/xp';

const LIST_LIMIT = 50;

const LEDGER_FIELDS = [
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

/**
 * Challenge has no draft status. Adding one would change settlement, the single
 * active-challenge index, and every "active" read. The wizard therefore saves
 * the challenge and every child row in one store transaction. Prisma rolls the
 * transaction back on any throw. The in-memory store used by tests does the same.
 * A repeated call finds the active challenge and refuses to create another one.
 * The client idempotency key is required so a double submit is an explicit retry;
 * the active-challenge constraint is what keeps the retry from inserting a second row.
 */
export async function setupChallenge(store: AscentStore, userId: string, input: unknown, now = new Date()) {
  const parsed = parseSetup(input, now);

  return store.transaction((tx) =>
    guardSetup(async () => {
      const active = await tx.findActiveChallenge(userId);
      if (active) throw new AscentRuleError('active_challenge_exists');

      const habits = [];
      const seenHabits = new Set<string>();
      for (const habitId of parsed.habitIds) {
        if (seenHabits.has(habitId)) throw new AscentRuleError('habit_already_linked');
        seenHabits.add(habitId);
        const habit = await tx.findHabit(habitId);
        if (!habit) throw new AscentRuleError('not_found');
        assertHabitOwner(habit.userId, userId);
        assertDailyHabitFrequency(habit.frequency);
        habits.push(habit);
      }

      const challenge = await tx.insertChallenge({
        userId,
        title: parsed.title,
        description: parsed.description,
        unwantedBehavior: parsed.unwantedBehavior,
        behaviorPreset: parsed.behaviorPreset,
        yearsStruggling: parsed.yearsStruggling,
        importance: parsed.importance,
        targetDays: parsed.targetDays,
        startsAt: parsed.startsAt,
        abstinenceStartedAt: parsed.abstinenceStartedAt,
        timezone: parsed.timezone,
      });
      await tx.insertRestriction({
        userId,
        challengeId: challenge.id,
        ...coreBehaviorRestriction(parsed.unwantedBehavior),
      });

      const rewardIds = new Map<string, string>();
      for (const reward of parsed.rewards) {
        const created = await tx.insertReward({
          userId,
          challengeId: challenge.id,
          title: reward.title,
          description: reward.description,
          icon: reward.icon,
          xpCost: reward.xpCost,
          active: true,
          available: true,
          sortOrder: reward.sortOrder,
        });
        rewardIds.set(reward.key, created.id);
      }

      for (const trigger of parsed.triggers) {
        await tx.insertTrigger({
          userId,
          challengeId: challenge.id,
          title: trigger.title,
          description: trigger.description,
          sortOrder: trigger.sortOrder,
        });
      }

      for (const [index, habit] of habits.entries()) {
        await tx.insertHabitLink({
          userId,
          challengeId: challenge.id,
          habitId: habit.id,
          required: true,
          sortOrder: index,
          completionRule: 'as_habit',
        });
      }

      for (const restriction of parsed.restrictions) {
        const rewardId = restriction.rewardKey ? rewardIds.get(restriction.rewardKey) ?? null : null;
        if (restriction.rewardKey && !rewardId) throw new AscentRuleError('invalid_restriction');
        const draft: RestrictionDraft = {
          title: restriction.title,
          description: restriction.description,
          kind: 'custom',
          unlockAfterSuccessfulDays: restriction.unlockAfterSuccessfulDays,
          rewardId,
          required: true,
          bypassable: restriction.bypassable,
          active: true,
          sortOrder: restriction.sortOrder,
        };
        assertRestrictionDraft(draft);
        await tx.insertRestriction({ userId, challengeId: challenge.id, ...draft });
      }

      for (const debt of parsed.customDebts) {
        await tx.insertCustomDebt({
          userId,
          challengeId: challenge.id,
          title: debt.title,
          description: debt.description,
          required: true,
          active: true,
          sortOrder: debt.sortOrder,
        });
      }

      for (const activity of parsed.activities) {
        assertActivityRule(activity.rule);
        await tx.insertActivity({
          userId,
          challengeId: challenge.id,
          title: activity.title,
          actionType: activity.actionType,
          ...activity.rule,
          sortOrder: activity.sortOrder,
        });
      }

      await syncOpenDay(tx, challenge, now);

      const [rewards, triggers, links, restrictions, customDebts, activities] = await Promise.all([
        tx.listRewards(challenge.id),
        tx.listTriggers(challenge.id),
        tx.listHabitLinks(challenge.id),
        tx.listRestrictions(challenge.id),
        tx.listCustomDebts(challenge.id),
        tx.listActivities(challenge.id),
      ]);

      return { challenge, rewards, triggers, habits: links, restrictions, customDebts, activities };
    })
  );
}

interface ParsedReward {
  key: string;
  title: string;
  description: string;
  icon: string | null;
  xpCost: number;
  sortOrder: number;
}

interface ParsedNamed {
  title: string;
  description: string;
  sortOrder: number;
}

interface ParsedRestriction {
  title: string;
  description: string;
  unlockAfterSuccessfulDays: number;
  rewardKey: string | null;
  bypassable: boolean;
  sortOrder: number;
}

interface ParsedActivity {
  title: string;
  actionType: string;
  rule: {
    unit: XpUnit;
    xpPerGrant: number;
    quantityPerGrant: number;
    minQuantity: number;
    active: boolean;
  };
  sortOrder: number;
}

interface ParsedSetup {
  title: string;
  description: string;
  unwantedBehavior: string;
  behaviorPreset: string | null;
  yearsStruggling: number | null;
  importance: number;
  targetDays: number;
  timezone: string;
  startsAt: Date;
  abstinenceStartedAt: Date;
  habitIds: string[];
  rewards: ParsedReward[];
  triggers: ParsedNamed[];
  restrictions: ParsedRestriction[];
  customDebts: ParsedNamed[];
  activities: ParsedActivity[];
}

function parseSetup(input: unknown, now: Date): ParsedSetup {
  const body = bodyOf(input);
  rejectFields(body, LEDGER_FIELDS);
  assertClientIdempotencyKey(typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '');
  const title = assertTitle(text(body.title, 'invalid_title', ASCENT_LIMITS.titleMax));
  const unwantedBehavior = assertTitle(text(body.unwantedBehavior, 'invalid_title', ASCENT_LIMITS.titleMax));
  const importance = assertImportance(typeof body.importance === 'number' ? body.importance : Number.NaN);
  const targetDays = assertTargetDays(typeof body.targetDays === 'number' ? body.targetDays : Number.NaN);
  const timezone = assertTimeZone(typeof body.timezone === 'string' ? body.timezone : '');
  const description = optionalText(body, 'description');
  const behaviorPreset = readPreset(body.behaviorPreset);
  const yearsStruggling = readYears(body.yearsStruggling);
  const startDate = has(body, 'startDate') ? body.startDate : null;
  const startsAt = resolveChallengeStartsAt(
    now,
    timezone,
    startDate == null ? null : typeof startDate === 'string' ? startDate : 'invalid'
  );
  const abstinenceStartedAt = optionalAbstinenceStart({
    now,
    timeZone: timezone,
    fallback: startsAt,
    date: body.abstinenceDate,
    time: body.abstinenceTime,
    mentioned: has(body, 'abstinenceDate') || has(body, 'abstinenceTime'),
  });

  const rewards = readList(body, 'rewards').map((item, index) => parseReward(item, index));
  const rewardKeys = new Set<string>();
  for (const reward of rewards) {
    if (rewardKeys.has(reward.key)) throw new AscentRuleError('invalid_challenge');
    rewardKeys.add(reward.key);
  }

  const restrictions = readList(body, 'restrictions').map((item, index) =>
    parseRestriction(item, index + 1, unwantedBehavior, rewardKeys)
  );

  return {
    title,
    description,
    unwantedBehavior,
    behaviorPreset,
    yearsStruggling,
    importance,
    targetDays,
    timezone,
    startsAt,
    abstinenceStartedAt,
    habitIds: readIdList(body, 'habitIds'),
    rewards,
    triggers: readList(body, 'triggers').map((item, index) => parseNamed(item, index)),
    restrictions,
    customDebts: readList(body, 'customDebts').map((item, index) => parseNamed(item, index)),
    activities: readList(body, 'activities').map((item, index) => parseActivity(item, index)),
  };
}

function parseReward(item: Record<string, unknown>, index: number): ParsedReward {
  rejectFields(item, ['xpBalance', 'attractiveness'], 'invalid_challenge');
  const key = text(item.key, 'invalid_challenge', 40);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(key)) throw new AscentRuleError('invalid_challenge');
  return {
    key,
    title: assertTitle(text(item.title, 'invalid_title', ASCENT_LIMITS.titleMax)),
    description: optionalText(item, 'description'),
    icon: item.icon == null || item.icon === '' ? null : text(item.icon, 'invalid_challenge', 40),
    xpCost: readCost(item.xpCost),
    sortOrder: readSort(item.sortOrder, index),
  };
}

function parseNamed(item: Record<string, unknown>, index: number): ParsedNamed {
  return {
    title: assertTitle(text(item.title, 'invalid_title', ASCENT_LIMITS.titleMax)),
    description: optionalText(item, 'description'),
    sortOrder: readSort(item.sortOrder, index),
  };
}

function parseRestriction(
  item: Record<string, unknown>,
  index: number,
  unwantedBehavior: string,
  rewardKeys: ReadonlySet<string>
): ParsedRestriction {
  if (item.kind === 'core_behavior') throw new AscentRuleError('core_behavior_not_bypassable');
  const title = assertTitle(text(item.title, 'invalid_title', ASCENT_LIMITS.titleMax));
  const bypassable = readBool(item.bypassable, false);
  const rewardKey = item.rewardKey == null || item.rewardKey === '' ? null : text(item.rewardKey, 'invalid_restriction', 40);
  if (bypassable && sameTitle(title, unwantedBehavior)) {
    throw new AscentRuleError('core_behavior_not_bypassable');
  }
  if (rewardKey && !rewardKeys.has(rewardKey)) throw new AscentRuleError('invalid_restriction');
  const draft: RestrictionDraft = {
    title,
    description: optionalText(item, 'description'),
    kind: 'custom',
    unlockAfterSuccessfulDays: readUnlock(item.unlockAfterSuccessfulDays),
    rewardId: rewardKey ? 'pending-reward' : null,
    required: true,
    bypassable,
    active: true,
    sortOrder: readSort(item.sortOrder, index),
  };
  assertRestrictionDraft(draft);
  return {
    title: draft.title,
    description: draft.description,
    unlockAfterSuccessfulDays: draft.unlockAfterSuccessfulDays,
    rewardKey,
    bypassable,
    sortOrder: draft.sortOrder,
  };
}

function parseActivity(item: Record<string, unknown>, index: number): ParsedActivity {
  rejectFields(item, ['xpBalance', 'xp'], 'invalid_activity_rule');
  const title = assertTitle(text(item.title, 'invalid_title', ASCENT_LIMITS.titleMax));
  const actionType = text(item.actionType, 'invalid_activity_rule', 80);
  if (!actionType) throw new AscentRuleError('invalid_activity_rule');
  const unit = readUnit(item.unit);
  const rule = {
    unit,
    xpPerGrant: typeof item.xpPerGrant === 'number' ? item.xpPerGrant : Number.NaN,
    quantityPerGrant: typeof item.quantityPerGrant === 'number' ? item.quantityPerGrant : Number.NaN,
    minQuantity: item.minQuantity == null ? 0 : readQuantity(item.minQuantity),
    active: true,
  };
  assertActivityRule(rule);
  return { title, actionType, rule, sortOrder: readSort(item.sortOrder, index) };
}

function sameTitle(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function bodyOf(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AscentRuleError('invalid_challenge');
  }
  return input as Record<string, unknown>;
}

function has(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function rejectFields(
  body: Record<string, unknown>,
  fields: readonly string[],
  code: AscentRuleError['code'] = 'invalid_challenge'
): void {
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

function optionalText(body: Record<string, unknown>, key: string): string {
  if (!has(body, key) || body[key] == null) return '';
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

function readSort(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new AscentRuleError('invalid_challenge');
  }
  return value;
}

function readBool(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;
  if (typeof value !== 'boolean') throw new AscentRuleError('invalid_restriction');
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
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 2_147_483_647) {
    throw new AscentRuleError('invalid_xp_cost');
  }
  return value;
}

function readUnlock(value: unknown): number {
  if (value == null) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new AscentRuleError('invalid_restriction');
  }
  return value;
}

function readList(body: Record<string, unknown>, key: string): Record<string, unknown>[] {
  if (!has(body, key) || body[key] == null) return [];
  if (!Array.isArray(body[key])) throw new AscentRuleError('invalid_challenge');
  const list = body[key] as unknown[];
  if (list.length > LIST_LIMIT) throw new AscentRuleError('invalid_challenge');
  return list.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new AscentRuleError('invalid_challenge');
    return item as Record<string, unknown>;
  });
}

function readIdList(body: Record<string, unknown>, key: string): string[] {
  if (!has(body, key) || body[key] == null) return [];
  if (!Array.isArray(body[key])) throw new AscentRuleError('invalid_challenge');
  const list = body[key] as unknown[];
  if (list.length > LIST_LIMIT) throw new AscentRuleError('invalid_challenge');
  return list.map((item) => text(item, 'invalid_challenge', 40));
}

async function guardSetup<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    rethrowStore(error);
  }
}
