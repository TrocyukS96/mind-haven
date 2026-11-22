import { describe, expect, it } from 'vitest';
import { AscentRuleError } from '@/shared/lib/ascent/errors';
import { formatLocalDate } from '@/shared/lib/ascent/local-date';
import { createMemoryAscentStore } from '@/shared/lib/ascent/memory-store';
import { getHistory, getToday } from '@/shared/lib/ascent/service';
import { setupChallenge } from '@/shared/lib/ascent/setup';
import type { AscentStore } from '@/shared/lib/ascent/store';

const USER = 'user-ascent-1';
const OTHER = 'user-ascent-2';
const ZONE = 'Europe/Minsk';
const NOW = new Date('2026-11-22T10:00:00.000Z');

function payload(extra: Record<string, unknown> = {}) {
  return {
    idempotencyKey: 'setup-key-001',
    title: '30 дней свободы',
    description: 'Хочу вернуть спокойное утро',
    unwantedBehavior: 'Курение',
    behaviorPreset: 'smoking',
    yearsStruggling: 4,
    importance: 80,
    targetDays: 30,
    timezone: ZONE,
    startDate: '2026-11-22',
    rewards: [
      { key: 'coffee', title: 'Кофе', description: 'Чашка', icon: 'coffee', xpCost: 70, sortOrder: 0 },
      { key: 'anime', title: 'Аниме', description: '', icon: 'tv', xpCost: 90, sortOrder: 1 },
    ],
    triggers: [{ title: 'Стресс', description: 'После работы', sortOrder: 0 }],
    habitIds: ['habit-daily-1'],
    restrictions: [
      {
        title: 'Без кофе',
        description: '',
        unlockAfterSuccessfulDays: 3,
        rewardKey: 'coffee',
        bypassable: true,
        sortOrder: 1,
      },
    ],
    customDebts: [{ title: 'Записать триггер', description: '', sortOrder: 0 }],
    activities: [
      {
        title: '100 отжиманий',
        actionType: 'pushups',
        unit: 'repetitions',
        xpPerGrant: 40,
        quantityPerGrant: 100,
        minQuantity: 1,
        sortOrder: 0,
      },
    ],
    ...extra,
  };
}

async function saveHabit(store: AscentStore, id: string, frequency: string, userId = USER) {
  await store.saveHabit({
    id,
    userId,
    name: id,
    frequency,
    streak: 0,
    completedDays: [],
    trackingType: 'check',
    targetCount: null,
    dayCounts: {},
  });
}

describe('ascent setup', () => {
  it('saves the full configuration in one active challenge and keeps the core rule strict', async () => {
    const store = createMemoryAscentStore();
    await saveHabit(store, 'habit-daily-1', 'Ежедневно');

    const created = await setupChallenge(store, USER, payload(), NOW);

    expect(created.challenge.title).toBe('30 дней свободы');
    expect(created.challenge.timezone).toBe(ZONE);
    expect(created.challenge.xpBalance).toBe(0);
    expect(created.challenge.currentStreak).toBe(0);
    expect(formatLocalDate(created.challenge.startsAt, ZONE)).toBe('2026-11-22');
    expect(created.rewards.map((reward) => [reward.title, reward.xpCost, reward.icon])).toEqual([
      ['Кофе', 70, 'coffee'],
      ['Аниме', 90, 'tv'],
    ]);
    expect(created.rewards.some((reward) => 'attractiveness' in reward)).toBe(false);
    expect(created.triggers).toHaveLength(1);
    expect(created.habits).toEqual([
      expect.objectContaining({ habitId: 'habit-daily-1', completionRule: 'as_habit', required: true }),
    ]);

    const core = created.restrictions.find((item) => item.kind === 'core_behavior');
    const coffee = created.restrictions.find((item) => item.title === 'Без кофе');
    expect(core).toMatchObject({
      bypassable: false,
      rewardId: null,
      unlockAfterSuccessfulDays: 0,
      required: true,
    });
    expect(coffee).toMatchObject({
      bypassable: true,
      unlockAfterSuccessfulDays: 3,
      rewardId: created.rewards[0]?.id,
    });
    expect(created.customDebts).toHaveLength(1);
    expect(created.activities[0]).toMatchObject({
      title: '100 отжиманий',
      xpPerGrant: 40,
      quantityPerGrant: 100,
      minQuantity: 1,
    });

    const today = await getToday(store, USER, NOW);
    expect(today.debt.map((item) => item.source).sort()).toEqual(['custom', 'habit', 'restriction', 'restriction']);
    expect(today.debt.some((item) => item.title === 'Стресс')).toBe(false);
    expect(today.challenge.currentStreak).toBe(0);
  });

  it('does not create a second challenge when setup is repeated or raced', async () => {
    const store = createMemoryAscentStore();
    await saveHabit(store, 'habit-daily-1', 'Ежедневно');
    await setupChallenge(store, USER, payload(), NOW);
    await expect(setupChallenge(store, USER, payload({ idempotencyKey: 'setup-key-002', title: 'Другое' }), NOW)).rejects.toMatchObject({
      code: 'active_challenge_exists',
    });
    expect(await store.listChallenges(USER)).toHaveLength(1);

    const raced = createMemoryAscentStore();
    await saveHabit(raced, 'habit-daily-1', 'Ежедневно');
    const results = await Promise.allSettled([
      setupChallenge(raced, USER, payload({ title: 'Первое' }), NOW),
      setupChallenge(raced, USER, payload({ idempotencyKey: 'setup-key-003', title: 'Второе' }), NOW),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await raced.listChallenges(USER)).toHaveLength(1);
  });

  it('rolls back the active challenge when a later write fails', async () => {
    const store = createMemoryAscentStore();
    await saveHabit(store, 'habit-daily-1', 'Ежедневно');
    const original = store.insertActivity.bind(store);
    store.insertActivity = async () => {
      throw new Error('disk');
    };

    await expect(setupChallenge(store, USER, payload(), NOW)).rejects.toThrow('disk');
    expect(await store.listChallenges(USER)).toEqual([]);
    expect(await store.listRewards('missing')).toEqual([]);

    store.insertActivity = original;
  });

  it('rejects a past start, a core-behavior bypass, and an invalid child before any row exists', async () => {
    const store = createMemoryAscentStore();
    await saveHabit(store, 'habit-daily-1', 'Ежедневно');
    await saveHabit(store, 'habit-week-1', 'week:3');
    await saveHabit(store, 'habit-foreign', 'Ежедневно', OTHER);

    await expect(setupChallenge(store, USER, payload({ startDate: '2026-11-21' }), NOW)).rejects.toMatchObject({
      code: 'start_date_in_past',
    });
    await expect(
      setupChallenge(
        store,
        USER,
        payload({
          restrictions: [
            { title: 'Курение', unlockAfterSuccessfulDays: 1, rewardKey: 'coffee', bypassable: true },
          ],
        }),
        NOW
      )
    ).rejects.toMatchObject({ code: 'core_behavior_not_bypassable' });
    await expect(
      setupChallenge(
        store,
        USER,
        payload({
          restrictions: [{ title: 'Обход', kind: 'core_behavior', bypassable: true, rewardKey: 'coffee' }],
        }),
        NOW
      )
    ).rejects.toMatchObject({ code: 'core_behavior_not_bypassable' });
    await expect(
      setupChallenge(store, USER, payload({ rewards: [{ key: 'coffee', title: 'Кофе', xpCost: 70, attractiveness: 80 }] }), NOW)
    ).rejects.toMatchObject({ code: 'invalid_challenge' });
    await expect(setupChallenge(store, USER, payload({ habitIds: ['habit-week-1'] }), NOW)).rejects.toMatchObject({
      code: 'habit_not_daily',
    });
    await expect(setupChallenge(store, USER, payload({ habitIds: ['missing-habit'] }), NOW)).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(setupChallenge(store, USER, payload({ idempotencyKey: 'no' }), NOW)).rejects.toMatchObject({
      code: 'invalid_idempotency_key',
    });
    expect(await store.listChallenges(USER)).toEqual([]);
  });

  it('does not turn a future start into successful days before that date', async () => {
    const store = createMemoryAscentStore();
    const created = await setupChallenge(store, USER, payload({ startDate: '2026-11-25', habitIds: [] }), NOW);

    expect(formatLocalDate(created.challenge.startsAt, ZONE)).toBe('2026-11-25');
    const before = await getToday(store, USER, NOW);
    expect(before.debt).toEqual([]);
    expect(before.challenge.currentStreak).toBe(0);
    expect(before.clock).toEqual({
      mode: 'countdown',
      startedAt: null,
      boundaryAt: created.challenge.startsAt.toISOString(),
    });

    const later = new Date('2026-11-26T10:00:00.000Z');
    const history = await getHistory(store, USER, created.challenge.id, later);
    expect(history.days.map((day) => [day.localDate, day.status])).toEqual([['2026-11-25', 'failed']]);
    expect(history.challenge.currentStreak).toBe(0);
    expect(history.challenge.xpBalance).toBe(0);
  });

  it('starts the abstinence clock earlier without marking the previous day successful', async () => {
    const store = createMemoryAscentStore();
    await saveHabit(store, 'habit-daily-1', 'Ежедневно');
    const created = await setupChallenge(
      store,
      USER,
      payload({ abstinenceDate: '2026-11-21', abstinenceTime: '18:30' }),
      NOW
    );

    expect(formatLocalDate(created.challenge.startsAt, ZONE)).toBe('2026-11-22');
    expect(created.challenge.abstinenceStartedAt.toISOString()).toBe('2026-11-21T15:30:00.000Z');
    const today = await getToday(store, USER, NOW);
    expect(today.currentStreak).toBe(0);
    expect(today.clock.startedAt).toBe('2026-11-21T15:30:00.000Z');
    const history = await getHistory(store, USER, created.challenge.id, NOW);
    expect(history.days.some((day) => day.localDate === '2026-11-21')).toBe(false);

    await expect(
      setupChallenge(store, OTHER, payload({ abstinenceDate: '2026-11-22', abstinenceTime: '18:00', habitIds: [] }), NOW)
    ).rejects.toMatchObject({ code: 'abstinence_start_in_future' });
  });
});
