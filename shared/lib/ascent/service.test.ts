import { describe, expect, it } from 'vitest';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import { createMemoryAscentStore } from '@/shared/lib/ascent/memory-store';
import type { AscentStore } from '@/shared/lib/ascent/store';
import {
  archiveChallenge,
  confirmDebtBatch,
  createActivity,
  createChallenge,
  createRestriction,
  createReward,
  createTrigger,
  deleteRestriction,
  earnXp,
  getChallenge,
  getHistory,
  getToday,
  linkHabit,
  recordViolation,
  listRewardPurchases,
  listXpTransactions,
  purchaseRewardXp,
  reverseActivity,
  setDebtConfirmation,
  unlinkHabit,
  updateActivity,
  updateChallenge,
  updateRestriction,
  updateReward,
  useRewardPurchase,
} from '@/shared/lib/ascent/service';

const USER = 'user-ascent-1';
const OTHER = 'user-ascent-2';
const ZONE = 'Europe/Minsk';

function at(iso: string): Date {
  return new Date(iso);
}

const OPEN = at('2026-11-20T10:00:00.000Z');
const NEXT = at('2026-11-21T10:00:00.000Z');
const LATER = at('2026-11-24T10:00:00.000Z');

function challengeInput(extra: Record<string, unknown> = {}) {
  return {
    title: 'Без курения',
    description: 'Тридцать дней',
    unwantedBehavior: 'Курение',
    behaviorPreset: 'smoking',
    yearsStruggling: 4,
    importance: 80,
    targetDays: 30,
    timezone: ZONE,
    ...extra,
  };
}

async function start(store: AscentStore, now = OPEN, extra: Record<string, unknown> = {}) {
  return createChallenge(store, USER, challengeInput(extra), now);
}

async function confirmSource(store: AscentStore, sourceId: string, now: Date) {
  const today = await getToday(store, USER, now);
  const item = today.debt.find((debt) => debt.sourceId === sourceId);
  expect(item).toBeTruthy();
  await setDebtConfirmation(store, USER, item!.id, { confirmed: true }, now);
  return today;
}

async function addRun(store: AscentStore, challengeId: string, now = OPEN) {
  const created = await createActivity(
    store,
    USER,
    challengeId,
    {
      title: 'Пробежка',
      actionType: 'run',
      unit: 'kilometers',
      xpPerGrant: 70,
      quantityPerGrant: 3,
      minQuantity: 1,
      active: true,
    },
    now
  );
  return created.activity;
}

describe('ascent challenge API', () => {
  it('creates one active challenge and rejects a second, a foreign read, and client-supplied XP', async () => {
    const store = createMemoryAscentStore();
    await expect(createChallenge(store, USER, challengeInput({ xpBalance: 500, currentStreak: 9 }), OPEN)).rejects.toMatchObject({
      code: 'invalid_challenge',
    });

    const created = await start(store);
    expect(created.challenge.userId).toBe(USER);
    expect(created.challenge.currentStreak).toBe(0);
    expect(created.challenge.bestStreak).toBe(0);
    expect(created.challenge.xpBalance).toBe(0);
    expect(created.challenge.xpEarnedTotal).toBe(0);
    expect(created.challenge.timezone).toBe(ZONE);
    expect(created.restriction.kind).toBe('core_behavior');
    expect(created.restriction.bypassable).toBe(false);
    expect(created.restriction.rewardId).toBeNull();

    await expect(start(store)).rejects.toBeInstanceOf(AscentRuleError);
    await expect(start(store)).rejects.toMatchObject({ code: 'active_challenge_exists' });
    await expect(getChallenge(store, OTHER, created.challenge.id, OPEN)).rejects.toMatchObject({ code: 'not_found' });
    await expect(updateChallenge(store, USER, created.challenge.id, { timezone: 'UTC' }, OPEN)).rejects.toMatchObject({
      code: 'timezone_locked',
    });
    await expect(updateChallenge(store, USER, created.challenge.id, { xpBalance: 10 }, OPEN)).rejects.toMatchObject({
      code: 'invalid_challenge',
    });

    const raced = createMemoryAscentStore();
    const results = await Promise.allSettled([
      createChallenge(raced, USER, challengeInput({ title: 'Первое' }), OPEN),
      createChallenge(raced, USER, challengeInput({ title: 'Второе' }), OPEN),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: 'active_challenge_exists' }),
    });
  });

  it('links only an owned daily habit and reads completion from the habit tracker', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    await store.saveHabit({
      id: 'habit-owned-1',
      userId: OTHER,
      name: 'Чужая',
      frequency: 'Ежедневно',
      streak: 0,
      completedDays: [],
      trackingType: 'check',
      targetCount: null,
      dayCounts: {},
    });
    await store.saveHabit({
      id: 'habit-week-01',
      userId: USER,
      name: 'Три раза',
      frequency: 'week:3',
      streak: 0,
      completedDays: [],
      trackingType: 'check',
      targetCount: null,
      dayCounts: {},
    });
    await store.saveHabit({
      id: 'habit-daily-1',
      userId: USER,
      name: 'Прогулка',
      frequency: 'Ежедневно',
      streak: 0,
      completedDays: [],
      trackingType: 'check',
      targetCount: null,
      dayCounts: {},
    });

    await expect(linkHabit(store, USER, created.challenge.id, { habitId: 'habit-owned-1' }, OPEN)).rejects.toMatchObject({
      code: 'habit_owner_mismatch',
    });
    await expect(linkHabit(store, USER, created.challenge.id, { habitId: 'habit-week-01' }, OPEN)).rejects.toMatchObject({
      code: 'habit_not_daily',
    });
    await expect(linkHabit(store, USER, created.challenge.id, { habitId: 'missing-habit' }, OPEN)).rejects.toMatchObject({
      code: 'not_found',
    });

    const linked = await linkHabit(store, USER, created.challenge.id, { habitId: 'habit-daily-1' }, OPEN);
    await expect(linkHabit(store, USER, created.challenge.id, { habitId: 'habit-daily-1' }, OPEN)).rejects.toMatchObject({
      code: 'habit_already_linked',
    });

    const open = await getToday(store, USER, OPEN);
    const habitDebt = open.debt.find((item) => item.source === 'habit');
    expect(habitDebt?.state).toBe('pending');
    await expect(setDebtConfirmation(store, USER, habitDebt!.id, { confirmed: true }, OPEN)).rejects.toMatchObject({
      code: 'debt_not_manual',
    });

    await store.saveHabit({
      id: 'habit-daily-1',
      userId: USER,
      name: 'Прогулка',
      frequency: 'Ежедневно',
      streak: 1,
      completedDays: ['2026-11-20'],
      trackingType: 'check',
      targetCount: null,
      dayCounts: {},
    });
    const met = await getToday(store, USER, OPEN);
    expect(met.debt.find((item) => item.source === 'habit')?.state).toBe('satisfied');

    await confirmSource(store, created.restriction.id, OPEN);
    const closed = await getToday(store, USER, NEXT);
    expect(closed.currentStreak).toBe(1);
    const history = await getHistory(store, USER, created.challenge.id, NEXT);
    expect(history.days[0]?.status).toBe('successful');
    expect(history.days[0]?.debt.find((item) => item.source === 'habit')?.state).toBe('satisfied');

    await unlinkHabit(store, USER, created.challenge.id, linked.link.id, NEXT);
    expect(await store.findHabit('habit-daily-1')).not.toBeNull();
  });

  it('grants proportional XP once, keeps concurrent grants consistent, and rejects a short balance', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    const run = await addRun(store, created.challenge.id);
    await expect(earnXp(store, OTHER, { activityId: run.id, quantity: 3, idempotencyKey: 'run-other1' }, OPEN)).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(earnXp(store, USER, { activityId: run.id, quantity: -1, idempotencyKey: 'run-neg001' }, OPEN)).rejects.toMatchObject({
      code: 'invalid_quantity',
    });

    const first = await earnXp(store, USER, { activityId: run.id, quantity: 3, idempotencyKey: 'run-00001' }, OPEN);
    expect(first.xp).toBe(70);
    expect(first.challenge.xpBalance).toBe(70);
    expect(first.challenge.xpEarnedTotal).toBe(70);
    expect(first.transaction?.note).toBe('Пробежка');

    const half = await earnXp(store, USER, { activityId: run.id, quantity: 1.5, idempotencyKey: 'run-00002' }, OPEN);
    expect(half.xp).toBe(35);
    expect(half.challenge.xpBalance).toBe(105);

    const replay = await earnXp(store, USER, { activityId: run.id, quantity: 3, idempotencyKey: 'run-00001' }, OPEN);
    expect(replay.replayed).toBe(true);
    expect(replay.challenge.xpBalance).toBe(105);

    const parallel = createMemoryAscentStore();
    const second = await start(parallel);
    const parallelRun = await addRun(parallel, second.challenge.id);
    const [left, right] = await Promise.all([
      earnXp(parallel, USER, { activityId: parallelRun.id, quantity: 3, idempotencyKey: 'run-left01' }, OPEN),
      earnXp(parallel, USER, { activityId: parallelRun.id, quantity: 1.5, idempotencyKey: 'run-right1' }, OPEN),
    ]);
    const balances = [left.challenge.xpBalance, right.challenge.xpBalance].sort((a, b) => a - b);
    expect(balances[1]).toBe(105);
    expect([35, 70]).toContain(balances[0]);
    const ledger = await listXpTransactions(parallel, USER, second.challenge.id, OPEN);
    expect(ledger.xpBalance).toBe(105);
    expect(ledger.transactions).toHaveLength(2);

    const raced = await Promise.all([
      earnXp(parallel, USER, { activityId: parallelRun.id, quantity: 3, idempotencyKey: 'run-same01' }, OPEN),
      earnXp(parallel, USER, { activityId: parallelRun.id, quantity: 3, idempotencyKey: 'run-same01' }, OPEN),
    ]);
    expect(raced.filter((item) => item.replayed)).toHaveLength(1);
    expect(ledger.xpBalance + 70).toBe(175);
    const afterRace = await listXpTransactions(parallel, USER, second.challenge.id, OPEN);
    expect(afterRace.xpBalance).toBe(175);
    expect(afterRace.transactions.filter((item) => item.reason === 'activity_grant')).toHaveLength(3);

    const expensive = await createReward(parallel, USER, second.challenge.id, { title: 'Поездка', xpCost: 500 }, OPEN);
    await expect(
      purchaseRewardXp(parallel, USER, expensive.reward.id, { idempotencyKey: 'buy-short1' }, OPEN)
    ).rejects.toMatchObject({ code: 'insufficient_xp' });
    expect((await listXpTransactions(parallel, USER, second.challenge.id, OPEN)).xpBalance).toBe(175);
    expect((await listRewardPurchases(parallel, USER, second.challenge.id, OPEN)).purchases).toHaveLength(0);

    const reward = await createReward(parallel, USER, second.challenge.id, { title: 'Фильм', xpCost: 100 }, OPEN);
    const bought = await purchaseRewardXp(parallel, USER, reward.reward.id, { idempotencyKey: 'buy-movie1' }, OPEN);
    expect(bought.challenge.xpBalance).toBe(75);
    expect(bought.challenge.xpEarnedTotal).toBe(175);
    const again = await purchaseRewardXp(parallel, USER, reward.reward.id, { idempotencyKey: 'buy-movie1' }, OPEN);
    expect(again.replayed).toBe(true);
    expect(again.challenge.xpBalance).toBe(75);
    expect((await listRewardPurchases(parallel, USER, second.challenge.id, OPEN)).purchases).toHaveLength(1);
  });

  it('sells a one-time bypass and refuses to spend XP on the core behavior', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    await expect(deleteRestriction(store, USER, created.challenge.id, created.restriction.id, OPEN)).rejects.toMatchObject({
      code: 'core_behavior_required',
    });
    const reward = await createReward(store, USER, created.challenge.id, { title: 'Десерт', xpCost: 30 }, OPEN);
    await expect(
      updateRestriction(store, USER, created.challenge.id, created.restriction.id, {
        bypassable: true,
        rewardId: reward.reward.id,
      }, OPEN)
    ).rejects.toMatchObject({ code: 'core_behavior_not_bypassable' });
    await expect(
      createRestriction(store, USER, created.challenge.id, { title: 'Ядро', kind: 'core_behavior' }, OPEN)
    ).rejects.toMatchObject({ code: 'invalid_restriction' });

    const custom = await createRestriction(
      store,
      USER,
      created.challenge.id,
      {
        title: 'Сладкое вечером',
        kind: 'custom',
        bypassable: true,
        rewardId: reward.reward.id,
        required: true,
        unlockAfterSuccessfulDays: 0,
      },
      OPEN
    );
    const run = await addRun(store, created.challenge.id);
    await earnXp(store, USER, { activityId: run.id, quantity: 3, idempotencyKey: 'run-bypass' }, OPEN);
    await expect(
      purchaseRewardXp(store, USER, reward.reward.id, { idempotencyKey: 'buy-core01', restrictionId: created.restriction.id }, OPEN)
    ).rejects.toMatchObject({ code: 'core_behavior_not_bypassable' });

    const bought = await purchaseRewardXp(
      store,
      USER,
      reward.reward.id,
      { idempotencyKey: 'buy-sweet1', restrictionId: custom.restriction.id },
      OPEN
    );
    expect(bought.purchase?.grantsBypass).toBe(true);
    expect(bought.challenge.xpBalance).toBe(40);
    const used = await useRewardPurchase(store, USER, created.challenge.id, bought.purchase!.id, OPEN);
    const replayed = await useRewardPurchase(store, USER, created.challenge.id, bought.purchase!.id, OPEN);
    expect(replayed.replayed).toBe(true);
    expect(used.purchase.permissionUsed).toBe(true);

    await confirmSource(store, created.restriction.id, OPEN);
    const closed = await getHistory(store, USER, created.challenge.id, NEXT);
    expect(closed.days[0]?.status).toBe('successful');
    expect(closed.days[0]?.debt.find((item) => item.sourceId === custom.restriction.id)?.state).toBe('bypassed');
    expect(closed.challenge.xpBalance).toBe(40);

    await expect(useRewardPurchase(store, USER, created.challenge.id, bought.purchase!.id, NEXT)).rejects.toMatchObject({
      code: 'permission_already_used',
    });
  });

  it('closes a kept day, resets a missed day without lowering the record, and ignores a second pass', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    await createTrigger(store, USER, created.challenge.id, { title: 'Стресс' }, OPEN);
    const before = await getToday(store, USER, OPEN);
    expect(before.preview.status).toBe('pending');
    expect(before.debt.every((item) => item.source !== 'custom' || item.sourceId !== 'trigger')).toBe(true);

    await confirmSource(store, created.restriction.id, OPEN);
    const keptOpen = await getToday(store, USER, OPEN);
    expect(keptOpen.preview.status).toBe('pending');
    expect(keptOpen.currentStreak).toBe(0);

    const kept = await getToday(store, USER, NEXT);
    expect(kept.localDate).toBe('2026-11-21');
    expect(kept.currentStreak).toBe(1);
    expect(kept.bestStreak).toBe(1);
    const run = await addRun(store, created.challenge.id, NEXT);
    await earnXp(store, USER, { activityId: run.id, quantity: 3, idempotencyKey: 'run-daytwo' }, NEXT);

    const missed = await getToday(store, USER, LATER);
    expect(missed.currentStreak).toBe(0);
    expect(missed.bestStreak).toBe(1);
    expect(missed.xpBalance).toBe(0);
    expect(missed.xpEarnedTotal).toBe(70);
    const history = await getHistory(store, USER, created.challenge.id, LATER);
    expect(history.days.map((day) => day.status)).toEqual(['successful', 'failed', 'failed', 'failed']);
    expect(history.days[1]?.debt).not.toEqual(history.days[0]?.debt);
    const resets = (await listXpTransactions(store, USER, created.challenge.id, LATER)).transactions.filter(
      (item) => item.reason === 'streak_reset'
    );
    expect(resets).toHaveLength(1);
    expect(resets[0]?.amount).toBe(-70);
    expect(resets[0]?.note).toBe('Сброс серии');

    const replay = await getHistory(store, USER, created.challenge.id, LATER);
    expect(replay.days).toHaveLength(4);
    expect(replay.challenge.xpBalance).toBe(0);
    expect(replay.challenge.bestStreak).toBe(1);
    expect(
      (await listXpTransactions(store, USER, created.challenge.id, LATER)).transactions.filter(
        (item) => item.reason === 'streak_reset'
      )
    ).toHaveLength(1);

    const yesterdayDebt = history.days[0]?.debt.find((item) => item.source === 'restriction');
    await expect(setDebtConfirmation(store, USER, yesterdayDebt!.id, { confirmed: false }, LATER)).rejects.toMatchObject({
      code: 'day_already_closed',
    });
  });

  it('does not close the current local date before midnight and completes on the target streak', async () => {
    const store = createMemoryAscentStore();
    const evening = at('2026-11-22T20:59:00.000Z');
    const midnight = at('2026-11-22T21:00:00.000Z');
    const created = await start(store, at('2026-11-22T12:00:00.000Z'), { targetDays: 2 });
    await confirmSource(store, created.restriction.id, evening);
    const beforeMidnight = await getToday(store, USER, evening);
    expect(beforeMidnight.localDate).toBe('2026-11-22');
    expect(beforeMidnight.currentStreak).toBe(0);
    expect((await getHistory(store, USER, created.challenge.id, evening)).days).toHaveLength(0);

    const morning = await getToday(store, USER, midnight);
    expect(morning.localDate).toBe('2026-11-23');
    expect(morning.currentStreak).toBe(1);
    expect(morning.bestStreak).toBe(1);

    await confirmSource(store, created.restriction.id, at('2026-11-23T12:00:00.000Z'));
    const finished = await getToday(store, USER, at('2026-11-24T12:00:00.000Z'));
    expect(finished.challenge.status).toBe('completed');
    expect(finished.currentStreak).toBe(2);
    expect(finished.bestStreak).toBe(2);

    const later = await getHistory(store, USER, created.challenge.id, at('2026-11-28T12:00:00.000Z'));
    expect(later.days.map((day) => day.localDate)).toEqual(['2026-11-22', '2026-11-23']);
    expect(later.challenge.currentStreak).toBe(2);
    expect(later.challenge.status).toBe('completed');
  });

  it('lets several missed days reset the streak once and still archives the history', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    const run = await addRun(store, created.challenge.id);
    await earnXp(store, USER, { activityId: run.id, quantity: 6, idempotencyKey: 'run-long01' }, OPEN);
    const missed = await getChallenge(store, USER, created.challenge.id, LATER);
    expect(missed.challenge.currentStreak).toBe(0);
    expect(missed.challenge.bestStreak).toBe(0);
    expect(missed.challenge.xpBalance).toBe(0);
    expect(missed.challenge.xpEarnedTotal).toBe(140);
    const days = await getHistory(store, USER, created.challenge.id, LATER);
    expect(days.days).toHaveLength(4);
    expect(days.days.every((day) => day.status === 'failed')).toBe(true);

    const archived = await archiveChallenge(store, USER, created.challenge.id, LATER);
    expect(archived.challenge.status).toBe('archived');
    expect((await getHistory(store, USER, created.challenge.id, at('2026-11-26T10:00:00.000Z'))).days).toHaveLength(4);
    const replacement = await start(store, at('2026-11-26T10:00:00.000Z'));
    expect(replacement.challenge.status).toBe('active');
  });

  it('confirms a manual item for today and reverses a same-day grant without a negative balance', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    const custom = await createRestriction(
      store,
      USER,
      created.challenge.id,
      { title: 'Без ленты', kind: 'custom', bypassable: false, required: true, unlockAfterSuccessfulDays: 3 },
      OPEN
    );
    await confirmDebtBatch(
      store,
      USER,
      created.challenge.id,
      '2026-11-20',
      { items: [{ source: 'restriction', sourceId: created.restriction.id, confirmed: true }, { source: 'restriction', sourceId: custom.restriction.id, confirmed: true }] },
      OPEN
    );
    const run = await addRun(store, created.challenge.id);
    const granted = await earnXp(store, USER, { activityId: run.id, quantity: 3, idempotencyKey: 'run-undo01' }, OPEN);
    const reversed = await reverseActivity(store, USER, created.challenge.id, granted.log!.id, OPEN);
    expect(reversed.challenge.xpBalance).toBe(0);
    expect(reversed.challenge.xpEarnedTotal).toBe(0);
    const second = await reverseActivity(store, USER, created.challenge.id, granted.log!.id, OPEN);
    expect(second.replayed).toBe(true);
  });

  it('moves the abstinence clock to the day after the last failure and keeps the record', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    await confirmSource(store, created.restriction.id, OPEN);
    const kept = await getToday(store, USER, NEXT);
    expect(kept.currentStreak).toBe(1);
    expect(kept.clock.mode).toBe('running');
    expect(kept.clock.startedAt).toBe(created.challenge.startsAt.toISOString());

    const reset = await getToday(store, USER, LATER);
    expect(reset.currentStreak).toBe(0);
    expect(reset.bestStreak).toBe(1);
    expect(reset.clock.mode).toBe('running');
    expect(reset.clock.startedAt).toBe('2026-11-23T21:00:00.000Z');
    expect(reset.xpBalance).toBe(0);
  });

  it('stops the clock when a restriction is broken and leaves the streak until the day closes', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    await confirmSource(store, created.restriction.id, OPEN);
    await getToday(store, USER, NEXT);
    await recordViolation(store, USER, created.challenge.id, created.restriction.id, NEXT);
    const broken = await getToday(store, USER, NEXT);
    expect(broken.currentStreak).toBe(1);
    expect(broken.preview.status).toBe('failed');
    expect(broken.clock).toEqual({
      mode: 'broken',
      startedAt: null,
      boundaryAt: '2026-11-21T21:00:00.000Z',
    });
  });

  it('corrects the abstinence clock without awarding days or changing the record', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    const updated = await updateChallenge(
      store,
      USER,
      created.challenge.id,
      { abstinenceDate: '2026-11-19', abstinenceTime: '18:30' },
      OPEN
    );
    expect(updated.challenge.abstinenceStartedAt.toISOString()).toBe('2026-11-19T15:30:00.000Z');
    expect(updated.challenge.startsAt.toISOString()).toBe(created.challenge.startsAt.toISOString());
    expect(updated.challenge.currentStreak).toBe(0);
    expect(updated.challenge.bestStreak).toBe(0);
    const today = await getToday(store, USER, OPEN);
    expect(today.clock.startedAt).toBe('2026-11-19T15:30:00.000Z');
    const history = await getHistory(store, USER, created.challenge.id, OPEN);
    expect(history.days).toEqual([]);
  });

  it('locks the abstinence clock after a reset and after a recorded violation', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    await recordViolation(store, USER, created.challenge.id, created.restriction.id, OPEN);
    await expect(
      updateChallenge(store, USER, created.challenge.id, { abstinenceDate: '2026-11-19', abstinenceTime: '12:00' }, OPEN)
    ).rejects.toMatchObject({ code: 'abstinence_start_locked' });
    const open = await getToday(store, USER, OPEN);
    expect(open.challenge.abstinenceStartedAt.toISOString()).toBe(created.challenge.startsAt.toISOString());
    expect(open.debt.some((item) => item.state === 'missed')).toBe(true);

    const second = createMemoryAscentStore();
    const again = await start(second);
    await confirmSource(second, again.restriction.id, OPEN);
    const reset = await getToday(second, USER, LATER);
    expect(reset.bestStreak).toBe(1);
    expect(reset.currentStreak).toBe(0);
    await expect(
      updateChallenge(second, USER, again.challenge.id, { abstinenceDate: '2026-11-19', abstinenceTime: '12:00' }, LATER)
    ).rejects.toMatchObject({ code: 'abstinence_start_locked' });
    const after = await getToday(second, USER, LATER);
    expect(after.bestStreak).toBe(1);
    expect(after.currentStreak).toBe(0);
    expect(after.challenge.abstinenceStartedAt.toISOString()).toBe(again.challenge.startsAt.toISOString());
  });

  it('keeps stored XP when a price changes and does not grant the same key twice', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    await confirmSource(store, created.restriction.id, OPEN);
    const run = await addRun(store, created.challenge.id);
    const granted = await earnXp(store, USER, { activityId: run.id, quantity: 1.5, idempotencyKey: 'run-half01' }, OPEN);
    expect(granted.xp).toBe(35);
    const replay = await earnXp(store, USER, { activityId: run.id, quantity: 5, idempotencyKey: 'run-half01' }, OPEN);
    expect(replay.replayed).toBe(true);
    expect(replay.xp).toBe(35);

    await updateActivity(store, USER, run.id, { xpPerGrant: 10 }, OPEN);
    const ledger = await listXpTransactions(store, USER, created.challenge.id, OPEN);
    expect(ledger.transactions.find((item) => item.reason === 'activity_grant')?.amount).toBe(35);
    const next = await earnXp(store, USER, { activityId: run.id, quantity: 3, idempotencyKey: 'run-new001' }, OPEN);
    expect(next.xp).toBe(10);
    expect((await getToday(store, USER, OPEN)).xpBalance).toBe(45);
  });

  it('keeps the XP spent on a purchase after the reward price changes', async () => {
    const store = createMemoryAscentStore();
    const created = await start(store);
    await confirmSource(store, created.restriction.id, OPEN);
    const run = await addRun(store, created.challenge.id);
    await earnXp(store, USER, { activityId: run.id, quantity: 3, idempotencyKey: 'buy-fund01' }, OPEN);
    const reward = await createReward(store, USER, created.challenge.id, { title: 'Сладкое', xpCost: 40 }, OPEN);
    const bought = await purchaseRewardXp(store, USER, reward.reward.id, { idempotencyKey: 'buy-sweet1' }, OPEN);
    expect(bought.xpSpent).toBe(40);
    const replay = await purchaseRewardXp(store, USER, reward.reward.id, { idempotencyKey: 'buy-sweet1' }, OPEN);
    expect(replay.replayed).toBe(true);
    await updateReward(store, USER, created.challenge.id, reward.reward.id, { xpCost: 10 }, OPEN);
    const purchases = await listRewardPurchases(store, USER, created.challenge.id, OPEN);
    expect(purchases.purchases[0]?.xpSpent).toBe(40);
    const ledger = await listXpTransactions(store, USER, created.challenge.id, OPEN);
    expect(ledger.transactions.find((item) => item.reason === 'reward_purchase')?.amount).toBe(-40);
    expect((await getToday(store, USER, OPEN)).xpBalance).toBe(30);
  });
});
