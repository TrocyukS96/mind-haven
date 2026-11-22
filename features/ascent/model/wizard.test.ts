import { describe, expect, it } from 'vitest';
import { isUnwantedBehaviorPreset } from '@/shared/lib/ascent/rules';
import {
  WIZARD_BEHAVIOR_PRESETS,
  behaviorName,
  createInitialDraft,
  emptyReward,
  moveByKey,
  parseWizardProgress,
  serializeWizardProgress,
  toSetupPayload,
  updateByKey,
  validateWizard,
  type WizardDraft,
} from '@/features/ascent/model/wizard';

const LABELS = {
  porn: 'Просмотр порно',
  smoking: 'Курение',
  overeating: 'Переедание',
  alcohol: 'Алкоголь',
  social_media: 'Социальные сети',
} as const;

function readyDraft(patch: Partial<WizardDraft> = {}): WizardDraft {
  const reward = { ...emptyReward(), key: 'coffee', title: 'Кофе', xpCost: '70', icon: 'coffee' };
  return {
    ...createInitialDraft(new Date('2026-11-22T10:00:00.000Z'), 'Europe/Minsk'),
    title: '30 дней свободы',
    behaviorPreset: 'smoking',
    description: 'Хочу вернуть утро',
    importance: 80,
    yearsStruggling: '4',
    rewards: [reward],
    triggers: [{ key: 'stress', title: 'Стресс', description: '' }],
    habitIds: ['habit-1'],
    restrictions: [
      {
        key: 'no-coffee',
        title: 'Без кофе',
        description: '',
        unlockAfterSuccessfulDays: '3',
        rewardKey: 'coffee',
        bypassable: true,
      },
    ],
    activities: [
      {
        key: 'pushups',
        title: '100 отжиманий',
        actionType: 'pushups',
        unit: 'repetitions',
        xpPerGrant: '40',
        quantityPerGrant: '100',
        minQuantity: '1',
      },
    ],
    acceptedRules: true,
    ...patch,
  };
}

const OPTIONS = {
  idempotencyKey: 'setup-key-001',
  today: '2026-11-22',
  labels: LABELS,
  habits: [{ id: 'habit-1', frequency: 'Ежедневно' }],
};

describe('ascent wizard draft', () => {
  it('keeps every preset the server accepts and builds a payload without an attractiveness score', () => {
    for (const preset of WIZARD_BEHAVIOR_PRESETS) {
      expect(isUnwantedBehaviorPreset(preset)).toBe(true);
    }

    const draft = readyDraft();
    const moved = moveByKey(updateByKey(draft.rewards, 'coffee', { xpCost: '85' }), 'coffee', 1);
    const payload = toSetupPayload({ ...draft, rewards: moved }, OPTIONS);

    expect(payload.rewards[0]?.xpCost).toBe(85);
    expect(payload.rewards[0]).not.toHaveProperty('attractiveness');
    expect(payload.unwantedBehavior).toBe('Курение');
    expect(payload.behaviorPreset).toBe('smoking');
    expect(payload.restrictions[0]).toMatchObject({ unlockAfterSuccessfulDays: 3, rewardKey: 'coffee', bypassable: true });
    expect(payload.activities[0]).toMatchObject({ xpPerGrant: 40, quantityPerGrant: 100, minQuantity: 1 });
    expect(payload.habitIds).toEqual(['habit-1']);
    expect(draft.title).toBe('30 дней свободы');
  });

  it('blocks a past start, a bypass of the core behavior, and a submit without the rules checkbox', () => {
    const past = validateWizard(readyDraft({ startDate: '2026-11-21' }), '2026-11-22', {
      behaviorName: 'Курение',
      acceptance: true,
    });
    expect(past.some((issue) => issue.code === 'start_date_past')).toBe(true);

    const bypass = validateWizard(
      readyDraft({
        restrictions: [
          {
            key: 'core',
            title: 'Курение',
            description: '',
            unlockAfterSuccessfulDays: '0',
            rewardKey: 'coffee',
            bypassable: true,
          },
        ],
      }),
      '2026-11-22',
      { behaviorName: behaviorName(readyDraft(), LABELS), acceptance: true }
    );
    expect(bypass.some((issue) => issue.code === 'core_bypass')).toBe(true);

    const unchecked = validateWizard(readyDraft({ acceptedRules: false }), '2026-11-22', {
      acceptance: true,
      behaviorName: 'Курение',
    });
    expect(unchecked.some((issue) => issue.field === 'acceptedRules')).toBe(true);

    const stepOnly = validateWizard(readyDraft({ acceptedRules: false, rewards: [] }), '2026-11-22');
    expect(stepOnly.some((issue) => issue.step === 0)).toBe(false);
    expect(stepOnly.some((issue) => issue.field === 'acceptedRules')).toBe(false);
  });

  it('allows a zero unlock threshold and a custom behavior name', () => {
    const draft = readyDraft({
      behaviorPreset: 'other',
      customBehavior: 'Ночные сериалы',
      restrictions: [
        {
          key: 'strict',
          title: 'Без сериалов вечером',
          description: '',
          unlockAfterSuccessfulDays: '0',
          rewardKey: '',
          bypassable: false,
        },
      ],
    });
    const payload = toSetupPayload(draft, OPTIONS);
    expect(payload.unwantedBehavior).toBe('Ночные сериалы');
    expect(payload.behaviorPreset).toBeNull();
    expect(payload.restrictions[0]).toMatchObject({ unlockAfterSuccessfulDays: 0, bypassable: false, rewardKey: null });
  });

  it('sends an earlier abstinence start and rejects a future clock time', () => {
    const now = new Date('2026-11-22T10:00:00.000Z');
    const earlier = readyDraft({ specifyAbstinence: true, abstinenceDate: '2026-11-21', abstinenceTime: '18:30' });
    expect(validateWizard(earlier, '2026-11-22', { now }).some((issue) => issue.field.startsWith('abstinence'))).toBe(false);
    expect(toSetupPayload(earlier, OPTIONS)).toMatchObject({ abstinenceDate: '2026-11-21', abstinenceTime: '18:30' });
    expect(toSetupPayload(readyDraft(), OPTIONS)).not.toHaveProperty('abstinenceDate');

    const saved = serializeWizardProgress(4, earlier);
    expect(parseWizardProgress(saved)).toEqual({ step: 4, draft: earlier });
    expect(parseWizardProgress('{"version":1,"step":9}')).toBeNull();
    expect(parseWizardProgress('not-json')).toBeNull();

    const future = readyDraft({ specifyAbstinence: true, abstinenceDate: '2026-11-22', abstinenceTime: '23:00' });
    expect(validateWizard(future, '2026-11-22', { now }).some((issue) => issue.code === 'abstinence_time_future')).toBe(true);
  });
});
