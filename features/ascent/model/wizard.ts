import { ASCENT_LIMITS, XP_UNITS, type XpUnit } from '@/entities/ascent/model/types';
import { isUnwantedBehaviorPreset } from '@/shared/lib/ascent/rules';
import { assertTimeZone, formatLocalDate, formatLocalTime } from '@/shared/lib/ascent/local-date';
import { isCompatibleDailyHabit } from '@/shared/lib/ascent/habit-link';

export const WIZARD_BEHAVIOR_PRESETS = ['porn', 'smoking', 'overeating', 'alcohol', 'social_media'] as const;
export type WizardBehaviorPreset = (typeof WIZARD_BEHAVIOR_PRESETS)[number];
export type WizardBehaviorChoice = WizardBehaviorPreset | 'other' | '';

export const WIZARD_STEPS = ['goal', 'rewards', 'triggers', 'habits', 'rules'] as const;
export type WizardStep = 0 | 1 | 2 | 3 | 4;

export interface WizardReward {
  key: string;
  title: string;
  description: string;
  icon: string | null;
  xpCost: string;
}

export interface WizardNamedItem {
  key: string;
  title: string;
  description: string;
}

export interface WizardRestriction {
  key: string;
  title: string;
  description: string;
  unlockAfterSuccessfulDays: string;
  rewardKey: string;
  bypassable: boolean;
}

export interface WizardActivity {
  key: string;
  title: string;
  actionType: string;
  unit: XpUnit;
  xpPerGrant: string;
  quantityPerGrant: string;
  minQuantity: string;
}

export interface WizardDraft {
  title: string;
  behaviorPreset: WizardBehaviorChoice;
  customBehavior: string;
  yearsStruggling: string;
  description: string;
  importance: number;
  targetDays: string;
  startDate: string;
  specifyAbstinence: boolean;
  abstinenceDate: string;
  abstinenceTime: string;
  timezone: string;
  rewards: WizardReward[];
  triggers: WizardNamedItem[];
  habitIds: string[];
  restrictions: WizardRestriction[];
  customDebts: WizardNamedItem[];
  activities: WizardActivity[];
  acceptedRules: boolean;
}

export interface WizardIssue {
  step: WizardStep;
  field: string;
  code: string;
}

export interface WizardHabitRef {
  id: string;
  frequency: string;
}

export interface AscentSetupPayload {
  idempotencyKey: string;
  title: string;
  description: string;
  unwantedBehavior: string;
  behaviorPreset: string | null;
  yearsStruggling: number | null;
  importance: number;
  targetDays: number;
  timezone: string;
  startDate: string;
  abstinenceDate?: string;
  abstinenceTime?: string;
  rewards: Array<{
    key: string;
    title: string;
    description: string;
    icon: string | null;
    xpCost: number;
    sortOrder: number;
  }>;
  triggers: Array<{ title: string; description: string; sortOrder: number }>;
  habitIds: string[];
  restrictions: Array<{
    title: string;
    description: string;
    unlockAfterSuccessfulDays: number;
    rewardKey: string | null;
    bypassable: boolean;
    sortOrder: number;
  }>;
  customDebts: Array<{ title: string; description: string; sortOrder: number }>;
  activities: Array<{
    title: string;
    actionType: string;
    unit: XpUnit;
    xpPerGrant: number;
    quantityPerGrant: number;
    minQuantity: number;
    sortOrder: number;
  }>;
}

export function createClientKey(): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return `k${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function browserTimeZone(): string {
  try {
    return assertTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? '');
  } catch {
    return 'UTC';
  }
}

export function createInitialDraft(now = new Date(), timeZone = browserTimeZone()): WizardDraft {
  return {
    title: '',
    behaviorPreset: '',
    customBehavior: '',
    yearsStruggling: '',
    description: '',
    importance: 50,
    targetDays: '30',
    startDate: formatLocalDate(now, timeZone),
    specifyAbstinence: false,
    abstinenceDate: formatLocalDate(now, timeZone),
    abstinenceTime: formatLocalTime(now, timeZone),
    timezone: timeZone,
    rewards: [],
    triggers: [],
    habitIds: [],
    restrictions: [],
    customDebts: [],
    activities: [],
    acceptedRules: false,
  };
}

export function emptyReward(): WizardReward {
  return { key: createClientKey(), title: '', description: '', icon: null, xpCost: '' };
}

export function emptyNamed(): WizardNamedItem {
  return { key: createClientKey(), title: '', description: '' };
}

export function emptyRestriction(): WizardRestriction {
  return {
    key: createClientKey(),
    title: '',
    description: '',
    unlockAfterSuccessfulDays: '0',
    rewardKey: '',
    bypassable: false,
  };
}

export function emptyActivity(): WizardActivity {
  return {
    key: createClientKey(),
    title: '',
    actionType: '',
    unit: 'repetitions',
    xpPerGrant: '',
    quantityPerGrant: '',
    minQuantity: '1',
  };
}

export function updateByKey<T extends { key: string }>(items: readonly T[], key: string, patch: Partial<T>): T[] {
  return items.map((item) => (item.key === key ? { ...item, ...patch } : item));
}

export function removeByKey<T extends { key: string }>(items: readonly T[], key: string): T[] {
  return items.filter((item) => item.key !== key);
}

export function moveByKey<T extends { key: string }>(items: readonly T[], key: string, direction: -1 | 1): T[] {
  const index = items.findIndex((item) => item.key === key);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= items.length) return [...items];
  const copy = [...items];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

export function behaviorName(draft: WizardDraft, labels: Record<WizardBehaviorPreset, string>): string {
  if (draft.behaviorPreset === 'other') return draft.customBehavior.trim();
  if (!draft.behaviorPreset) return '';
  return (labels[draft.behaviorPreset] ?? '').trim();
}

export function validateWizard(
  draft: WizardDraft,
  today: string,
  options: {
    acceptance?: boolean;
    behaviorName?: string;
    habits?: readonly WizardHabitRef[];
    now?: Date;
  } = {}
): WizardIssue[] {
  const issues: WizardIssue[] = [];
  const name = (options.behaviorName ?? behaviorName(draft, emptyLabels())).trim();

  if (!draft.title.trim()) issues.push(issue(0, 'title', 'title_required'));
  else if (draft.title.trim().length > ASCENT_LIMITS.titleMax) issues.push(issue(0, 'title', 'title_too_long'));

  if (!draft.behaviorPreset || (draft.behaviorPreset === 'other' && !draft.customBehavior.trim())) {
    issues.push(issue(0, 'behavior', 'behavior_required'));
  } else if (draft.behaviorPreset === 'other' && draft.customBehavior.trim().length > ASCENT_LIMITS.titleMax) {
    issues.push(issue(0, 'behavior', 'title_too_long'));
  } else if (draft.behaviorPreset !== 'other' && !isWizardPreset(draft.behaviorPreset)) {
    issues.push(issue(0, 'behavior', 'behavior_required'));
  }

  if (draft.yearsStruggling.trim()) {
    const years = parseInteger(draft.yearsStruggling, 0, ASCENT_LIMITS.yearsMax);
    if (years == null) issues.push(issue(0, 'yearsStruggling', 'years_invalid'));
  }

  if (draft.description.trim().length > ASCENT_LIMITS.descriptionMax) {
    issues.push(issue(0, 'description', 'description_too_long'));
  }

  if (!Number.isInteger(draft.importance) || draft.importance < 0 || draft.importance > 100) {
    issues.push(issue(0, 'importance', 'importance_invalid'));
  }

  if (parseInteger(draft.targetDays, ASCENT_LIMITS.targetDaysMin, ASCENT_LIMITS.targetDaysMax) == null) {
    issues.push(issue(0, 'targetDays', 'target_days_invalid'));
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)) issues.push(issue(0, 'startDate', 'start_date_invalid'));
  else if (draft.startDate < today) issues.push(issue(0, 'startDate', 'start_date_past'));

  if (draft.specifyAbstinence) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.abstinenceDate)) {
      issues.push(issue(0, 'abstinenceDate', 'abstinence_date_invalid'));
    } else if (draft.abstinenceDate > today) {
      issues.push(issue(0, 'abstinenceDate', 'abstinence_date_future'));
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.abstinenceTime)) {
      issues.push(issue(0, 'abstinenceTime', 'abstinence_time_invalid'));
    } else if (draft.abstinenceDate === today && options.now) {
      try {
        const local = formatLocalTime(options.now, draft.timezone);
        if (draft.abstinenceTime > local) issues.push(issue(0, 'abstinenceTime', 'abstinence_time_future'));
      } catch {
        issues.push(issue(0, 'abstinenceTime', 'abstinence_time_invalid'));
      }
    }
  }

  try {
    assertTimeZone(draft.timezone);
  } catch {
    issues.push(issue(0, 'timezone', 'timezone_invalid'));
  }

  for (const reward of draft.rewards) {
    if (!reward.title.trim()) issues.push(issue(1, `reward:${reward.key}:title`, 'reward_title'));
    else if (reward.title.trim().length > ASCENT_LIMITS.titleMax) {
      issues.push(issue(1, `reward:${reward.key}:title`, 'title_too_long'));
    }
    if (parseInteger(reward.xpCost, 0, 2_147_483_647) == null) {
      issues.push(issue(1, `reward:${reward.key}:xpCost`, 'reward_cost'));
    }
    if (reward.icon && reward.icon.length > 40) issues.push(issue(1, `reward:${reward.key}:icon`, 'reward_icon'));
  }

  for (const trigger of draft.triggers) {
    pushNamedIssues(issues, 2, 'trigger', trigger);
  }

  const knownHabits = new Map((options.habits ?? []).map((habit) => [habit.id, habit]));
  for (const habitId of draft.habitIds) {
    const habit = knownHabits.get(habitId);
    if (habit && !isCompatibleDailyHabit(habit.frequency)) {
      issues.push(issue(3, `habit:${habitId}`, 'habit_not_daily'));
    }
  }

  const rewardKeys = new Set(draft.rewards.map((reward) => reward.key));
  for (const restriction of draft.restrictions) {
    if (!restriction.title.trim()) issues.push(issue(4, `restriction:${restriction.key}:title`, 'restriction_title'));
    else if (name && restriction.bypassable && sameText(restriction.title, name)) {
      issues.push(issue(4, `restriction:${restriction.key}:title`, 'core_bypass'));
    }
    if (parseInteger(restriction.unlockAfterSuccessfulDays, 0, 100_000) == null) {
      issues.push(issue(4, `restriction:${restriction.key}:unlock`, 'restriction_unlock'));
    }
    if (restriction.bypassable && !rewardKeys.has(restriction.rewardKey)) {
      issues.push(issue(4, `restriction:${restriction.key}:reward`, 'restriction_reward'));
    }
  }

  for (const debt of draft.customDebts) pushNamedIssues(issues, 4, 'debt', debt);

  for (const activity of draft.activities) {
    if (!activity.title.trim()) issues.push(issue(4, `activity:${activity.key}:title`, 'activity_title'));
    if (!activity.actionType.trim() || activity.actionType.trim().length > 80) {
      issues.push(issue(4, `activity:${activity.key}:actionType`, 'activity_type'));
    }
    const xp = parseInteger(activity.xpPerGrant, 1, ASCENT_LIMITS.xpPerGrantMax);
    const quantity = parseDecimal(activity.quantityPerGrant, false);
    const minimum = parseDecimal(activity.minQuantity, true);
    if (!isXpUnit(activity.unit) || xp == null || quantity == null || minimum == null) {
      issues.push(issue(4, `activity:${activity.key}:rule`, 'activity_rule'));
    }
  }

  if (options.acceptance && !draft.acceptedRules) issues.push(issue(4, 'acceptedRules', 'rules_required'));

  return issues;
}

export function issuesForStep(issues: readonly WizardIssue[], step: WizardStep): WizardIssue[] {
  return issues.filter((item) => item.step === step);
}

export function issueCode(issues: readonly WizardIssue[], field: string): string | null {
  return issues.find((item) => item.field === field)?.code ?? null;
}

export function firstInvalidStep(issues: readonly WizardIssue[]): WizardStep | null {
  if (issues.length === 0) return null;
  return issues.reduce((min, item) => (item.step < min ? item.step : min), issues[0].step);
}

const WIZARD_PROGRESS_VERSION = 1;

export function serializeWizardProgress(step: WizardStep, draft: WizardDraft): string {
  return JSON.stringify({ version: WIZARD_PROGRESS_VERSION, step, draft });
}

export function parseWizardProgress(raw: string): { step: WizardStep; draft: WizardDraft } | null {
  try {
    return parseWizardProgressValue(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function toSetupPayload(
  draft: WizardDraft,
  options: {
    idempotencyKey: string;
    today: string;
    labels: Record<WizardBehaviorPreset, string>;
    habits?: readonly WizardHabitRef[];
  }
): AscentSetupPayload {
  const name = behaviorName(draft, options.labels);
  const issues = validateWizard(draft, options.today, {
    acceptance: true,
    behaviorName: name,
    habits: options.habits,
  });
  if (issues.length > 0) {
    throw new WizardInputError(issues);
  }

  return {
    idempotencyKey: options.idempotencyKey,
    title: draft.title.trim(),
    description: draft.description.trim(),
    unwantedBehavior: name,
    behaviorPreset: draft.behaviorPreset === 'other' ? null : draft.behaviorPreset,
    yearsStruggling: draft.yearsStruggling.trim() ? Number(draft.yearsStruggling) : null,
    importance: draft.importance,
    targetDays: Number(draft.targetDays),
    timezone: draft.timezone.trim(),
    startDate: draft.startDate,
    ...(draft.specifyAbstinence
      ? { abstinenceDate: draft.abstinenceDate, abstinenceTime: draft.abstinenceTime }
      : {}),
    rewards: draft.rewards.map((reward, index) => ({
      key: reward.key,
      title: reward.title.trim(),
      description: reward.description.trim(),
      icon: reward.icon,
      xpCost: Number(reward.xpCost),
      sortOrder: index,
    })),
    triggers: draft.triggers.map((trigger, index) => ({
      title: trigger.title.trim(),
      description: trigger.description.trim(),
      sortOrder: index,
    })),
    habitIds: [...draft.habitIds],
    restrictions: draft.restrictions.map((restriction, index) => ({
      title: restriction.title.trim(),
      description: restriction.description.trim(),
      unlockAfterSuccessfulDays: Number(restriction.unlockAfterSuccessfulDays),
      rewardKey: restriction.bypassable ? restriction.rewardKey : null,
      bypassable: restriction.bypassable,
      sortOrder: index + 1,
    })),
    customDebts: draft.customDebts.map((debt, index) => ({
      title: debt.title.trim(),
      description: debt.description.trim(),
      sortOrder: index,
    })),
    activities: draft.activities.map((activity, index) => ({
      title: activity.title.trim(),
      actionType: activity.actionType.trim(),
      unit: activity.unit,
      xpPerGrant: Number(activity.xpPerGrant),
      quantityPerGrant: Number(activity.quantityPerGrant.replace(',', '.')),
      minQuantity: Number(activity.minQuantity.replace(',', '.')),
      sortOrder: index,
    })),
  };
}

export class WizardInputError extends Error {
  readonly issues: readonly WizardIssue[];

  constructor(issues: readonly WizardIssue[]) {
    super('Invalid ascent wizard');
    this.name = 'WizardInputError';
    this.issues = issues;
  }
}

function parseWizardProgressValue(value: unknown): { step: WizardStep; draft: WizardDraft } | null {
  if (!isRecord(value) || value.version !== WIZARD_PROGRESS_VERSION) return null;
  if (value.step !== 0 && value.step !== 1 && value.step !== 2 && value.step !== 3 && value.step !== 4) return null;
  const draft = parseDraft(value.draft);
  if (!draft) return null;
  return { step: value.step, draft };
}

function parseDraft(value: unknown): WizardDraft | null {
  if (!isRecord(value) || !isBehaviorChoice(value.behaviorPreset)) return null;
  if (!isString(value.title) || !isString(value.customBehavior) || !isString(value.yearsStruggling)) return null;
  if (!isString(value.description) || !isString(value.targetDays) || !isString(value.startDate)) return null;
  if (!isString(value.abstinenceDate) || !isString(value.abstinenceTime) || !isString(value.timezone)) return null;
  if (typeof value.importance !== 'number' || !Number.isInteger(value.importance)) return null;
  if (value.importance < 0 || value.importance > 100) return null;
  if (typeof value.specifyAbstinence !== 'boolean' || typeof value.acceptedRules !== 'boolean') return null;
  const rewards = parseList(value.rewards, parseReward);
  const triggers = parseList(value.triggers, parseNamed);
  const restrictions = parseList(value.restrictions, parseRestriction);
  const customDebts = parseList(value.customDebts, parseNamed);
  const activities = parseList(value.activities, parseActivity);
  const habitIds = parseList(value.habitIds, parseId);
  if (!rewards || !triggers || !restrictions || !customDebts || !activities || !habitIds) return null;
  return {
    title: value.title,
    behaviorPreset: value.behaviorPreset,
    customBehavior: value.customBehavior,
    yearsStruggling: value.yearsStruggling,
    description: value.description,
    importance: value.importance,
    targetDays: value.targetDays,
    startDate: value.startDate,
    specifyAbstinence: value.specifyAbstinence,
    abstinenceDate: value.abstinenceDate,
    abstinenceTime: value.abstinenceTime,
    timezone: value.timezone,
    rewards,
    triggers,
    habitIds,
    restrictions,
    customDebts,
    activities,
    acceptedRules: value.acceptedRules,
  };
}

function parseReward(value: unknown): WizardReward | null {
  if (!isRecord(value) || !isId(value.key) || !isString(value.title) || !isString(value.description)) return null;
  if (!isString(value.xpCost) || (value.icon != null && !isString(value.icon))) return null;
  return {
    key: value.key,
    title: value.title,
    description: value.description,
    icon: typeof value.icon === 'string' ? value.icon : null,
    xpCost: value.xpCost,
  };
}

function parseNamed(value: unknown): WizardNamedItem | null {
  if (!isRecord(value) || !isId(value.key) || !isString(value.title) || !isString(value.description)) return null;
  return { key: value.key, title: value.title, description: value.description };
}

function parseRestriction(value: unknown): WizardRestriction | null {
  if (!isRecord(value) || !isId(value.key) || !isString(value.title) || !isString(value.description)) return null;
  if (!isString(value.unlockAfterSuccessfulDays) || !isString(value.rewardKey)) return null;
  if (typeof value.bypassable !== 'boolean') return null;
  return {
    key: value.key,
    title: value.title,
    description: value.description,
    unlockAfterSuccessfulDays: value.unlockAfterSuccessfulDays,
    rewardKey: value.rewardKey,
    bypassable: value.bypassable,
  };
}

function parseActivity(value: unknown): WizardActivity | null {
  if (!isRecord(value) || !isId(value.key) || !isString(value.title) || !isString(value.actionType)) return null;
  if (!isString(value.unit) || !isXpUnit(value.unit)) return null;
  if (!isString(value.xpPerGrant) || !isString(value.quantityPerGrant) || !isString(value.minQuantity)) return null;
  return {
    key: value.key,
    title: value.title,
    actionType: value.actionType,
    unit: value.unit,
    xpPerGrant: value.xpPerGrant,
    quantityPerGrant: value.quantityPerGrant,
    minQuantity: value.minQuantity,
  };
}

function parseId(value: unknown): string | null {
  return isId(value) ? value : null;
}

function parseList<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const items: T[] = [];
  for (const item of value) {
    const parsed = parse(item);
    if (!parsed) return null;
    items.push(parsed);
  }
  return items;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 80;
}

function isBehaviorChoice(value: unknown): value is WizardBehaviorChoice {
  return value === '' || value === 'other' || (typeof value === 'string' && isWizardPreset(value));
}

function issue(step: WizardStep, field: string, code: string): WizardIssue {
  return { step, field, code };
}

function pushNamedIssues(
  issues: WizardIssue[],
  step: WizardStep,
  prefix: string,
  item: WizardNamedItem
) {
  if (!item.title.trim()) issues.push(issue(step, `${prefix}:${item.key}:title`, `${prefix === 'debt' ? 'debt' : 'trigger'}_title`));
  else if (item.title.trim().length > ASCENT_LIMITS.titleMax) {
    issues.push(issue(step, `${prefix}:${item.key}:title`, 'title_too_long'));
  }
  if (item.description.trim().length > ASCENT_LIMITS.descriptionMax) {
    issues.push(issue(step, `${prefix}:${item.key}:description`, 'description_too_long'));
  }
}

function parseInteger(value: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const number = Number(value.trim());
  if (!Number.isSafeInteger(number) || number < min || number > max) return null;
  return number;
}

function parseDecimal(value: string, allowZero: boolean): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number) || number > ASCENT_LIMITS.quantityMax) return null;
  if (allowZero ? number < 0 : number <= 0) return null;
  return number;
}

function sameText(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function isWizardPreset(value: string): value is WizardBehaviorPreset {
  return (WIZARD_BEHAVIOR_PRESETS as readonly string[]).includes(value) && isUnwantedBehaviorPreset(value);
}

function isXpUnit(value: string): value is XpUnit {
  return (XP_UNITS as readonly string[]).includes(value);
}

function emptyLabels(): Record<WizardBehaviorPreset, string> {
  return { porn: '', smoking: '', overeating: '', alcohol: '', social_media: '' };
}
