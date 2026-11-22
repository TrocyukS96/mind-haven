import {
  CHALLENGE_DAY_STATUSES,
  CHALLENGE_STATUSES,
  DEBT_ITEM_STATES,
  DEBT_SOURCES,
  RESTRICTION_KINDS,
  XP_TRANSACTION_REASONS,
  XP_UNITS,
  type ChallengeDayStatus,
  type ChallengeStatus,
  type DebtItemState,
  type DebtSource,
  type RestrictionKind,
  type XpTransactionReason,
  type XpUnit,
} from '@/entities/ascent/model/types';
import { AscentRequestError } from '@/features/ascent/api/ascent-client';
import type { AscentClock } from '@/shared/lib/ascent/abstinence';

const CLOCK_MODES = ['countdown', 'running', 'broken', 'frozen'] as const;

export interface DeskChallenge {
  id: string;
  title: string;
  description: string;
  unwantedBehavior: string;
  importance: number;
  targetDays: number;
  startsAt: string;
  abstinenceStartedAt: string;
  status: ChallengeStatus;
  currentStreak: number;
  bestStreak: number;
  timezone: string;
  xpBalance: number;
  xpEarnedTotal: number;
  updatedAt: string;
}

export interface DeskReward {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  xpCost: number;
  active: boolean;
  available: boolean;
  sortOrder: number;
}

export interface DeskTrigger {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
}

export interface DeskHabitLink {
  id: string;
  habitId: string;
  required: boolean;
  sortOrder: number;
  name: string;
  frequency: string;
}

export interface DeskRestriction {
  id: string;
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

export interface DeskCustomDebt {
  id: string;
  title: string;
  description: string;
  required: boolean;
  active: boolean;
  sortOrder: number;
}

export interface DeskActivity {
  id: string;
  title: string;
  actionType: string;
  unit: XpUnit;
  xpPerGrant: number;
  quantityPerGrant: number;
  minQuantity: number;
  active: boolean;
  sortOrder: number;
}

export interface DeskDebt {
  id: string;
  source: DebtSource;
  sourceId: string;
  title: string;
  required: boolean;
  state: DebtItemState;
  sortOrder: number;
}

export interface DeskPurchase {
  id: string;
  rewardId: string;
  rewardTitle: string;
  restrictionId: string | null;
  xpSpent: number;
  grantsBypass: boolean;
  permissionUsed: boolean;
  usedOnLocalDate: string | null;
  purchasedAt: string;
}

export interface DeskTransaction {
  id: string;
  amount: number;
  reason: XpTransactionReason;
  balanceAfter: number;
  localDate: string | null;
  activityLogId: string | null;
  note: string;
  createdAt: string;
}

export interface AscentDesk {
  challenge: DeskChallenge;
  localDate: string;
  currentStreak: number;
  bestStreak: number;
  xpBalance: number;
  xpEarnedTotal: number;
  clock: AscentClock;
  debt: DeskDebt[];
  rewards: DeskReward[];
  triggers: DeskTrigger[];
  habits: DeskHabitLink[];
  restrictions: DeskRestriction[];
  customDebts: DeskCustomDebt[];
  activities: DeskActivity[];
  purchases: DeskPurchase[];
  transactions: DeskTransaction[];
  days: { localDate: string; status: ChallengeDayStatus }[];
}

function malformed(key: string): never {
  throw new AscentRequestError(`Malformed ${key}`, 500, null);
}

function record(value: unknown, key: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) malformed(key);
  return value as Record<string, unknown>;
}

function text(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== 'string') malformed(key);
  return value;
}

function maybeText(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  if (value == null) return null;
  if (typeof value !== 'string') malformed(key);
  return value;
}

function num(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) malformed(key);
  return value;
}

function flag(source: Record<string, unknown>, key: string): boolean {
  const value = source[key];
  if (typeof value !== 'boolean') malformed(key);
  return value;
}

function oneOf<T extends string>(source: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const value = source[key];
  if (typeof value !== 'string' || !allowed.includes(value as T)) malformed(key);
  return value as T;
}

function list(value: unknown, key: string): unknown[] {
  if (!Array.isArray(value)) malformed(key);
  return value;
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = (await response.json()) as unknown;
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function send(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, init);
  const body = await readBody(response);
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : 'Request failed';
    const code = typeof body.code === 'string' ? body.code : null;
    throw new AscentRequestError(message, response.status, code);
  }
  return body;
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

function parseClock(value: unknown): AscentClock {
  const source = record(value, 'clock');
  return {
    mode: oneOf(source, 'mode', CLOCK_MODES),
    startedAt: maybeText(source, 'startedAt'),
    boundaryAt: maybeText(source, 'boundaryAt'),
  };
}

function parseChallenge(value: unknown): DeskChallenge {
  const source = record(value, 'challenge');
  return {
    id: text(source, 'id'),
    title: text(source, 'title'),
    description: text(source, 'description'),
    unwantedBehavior: text(source, 'unwantedBehavior'),
    importance: num(source, 'importance'),
    targetDays: num(source, 'targetDays'),
    startsAt: text(source, 'startsAt'),
    abstinenceStartedAt: text(source, 'abstinenceStartedAt'),
    status: oneOf(source, 'status', CHALLENGE_STATUSES),
    currentStreak: num(source, 'currentStreak'),
    bestStreak: num(source, 'bestStreak'),
    timezone: text(source, 'timezone'),
    xpBalance: num(source, 'xpBalance'),
    xpEarnedTotal: num(source, 'xpEarnedTotal'),
    updatedAt: text(source, 'updatedAt'),
  };
}

function parseReward(value: unknown): DeskReward {
  const source = record(value, 'reward');
  return {
    id: text(source, 'id'),
    title: text(source, 'title'),
    description: text(source, 'description'),
    icon: maybeText(source, 'icon'),
    xpCost: num(source, 'xpCost'),
    active: flag(source, 'active'),
    available: flag(source, 'available'),
    sortOrder: num(source, 'sortOrder'),
  };
}

function parseTrigger(value: unknown): DeskTrigger {
  const source = record(value, 'trigger');
  return {
    id: text(source, 'id'),
    title: text(source, 'title'),
    description: text(source, 'description'),
    sortOrder: num(source, 'sortOrder'),
  };
}

function parseHabitLink(value: unknown): DeskHabitLink {
  const source = record(value, 'habitLink');
  const habit = source.habit == null ? null : record(source.habit, 'habit');
  return {
    id: text(source, 'id'),
    habitId: text(source, 'habitId'),
    required: flag(source, 'required'),
    sortOrder: num(source, 'sortOrder'),
    name: habit ? text(habit, 'name') : text(source, 'habitId'),
    frequency: habit ? text(habit, 'frequency') : '',
  };
}

function parseRestriction(value: unknown): DeskRestriction {
  const source = record(value, 'restriction');
  return {
    id: text(source, 'id'),
    title: text(source, 'title'),
    description: text(source, 'description'),
    kind: oneOf(source, 'kind', RESTRICTION_KINDS),
    unlockAfterSuccessfulDays: num(source, 'unlockAfterSuccessfulDays'),
    rewardId: maybeText(source, 'rewardId'),
    required: flag(source, 'required'),
    bypassable: flag(source, 'bypassable'),
    active: flag(source, 'active'),
    sortOrder: num(source, 'sortOrder'),
  };
}

function parseDebtDefinition(value: unknown): DeskCustomDebt {
  const source = record(value, 'customDebt');
  return {
    id: text(source, 'id'),
    title: text(source, 'title'),
    description: text(source, 'description'),
    required: flag(source, 'required'),
    active: flag(source, 'active'),
    sortOrder: num(source, 'sortOrder'),
  };
}

function parseActivity(value: unknown): DeskActivity {
  const source = record(value, 'activity');
  return {
    id: text(source, 'id'),
    title: text(source, 'title'),
    actionType: text(source, 'actionType'),
    unit: oneOf(source, 'unit', XP_UNITS),
    xpPerGrant: num(source, 'xpPerGrant'),
    quantityPerGrant: num(source, 'quantityPerGrant'),
    minQuantity: num(source, 'minQuantity'),
    active: flag(source, 'active'),
    sortOrder: num(source, 'sortOrder'),
  };
}

function parseTodayDebt(value: unknown): DeskDebt {
  const source = record(value, 'debt');
  return {
    id: text(source, 'id'),
    source: oneOf(source, 'source', DEBT_SOURCES),
    sourceId: text(source, 'sourceId'),
    title: text(source, 'title'),
    required: flag(source, 'required'),
    state: oneOf(source, 'state', DEBT_ITEM_STATES),
    sortOrder: num(source, 'sortOrder'),
  };
}

function parsePurchase(value: unknown): DeskPurchase {
  const source = record(value, 'purchase');
  return {
    id: text(source, 'id'),
    rewardId: text(source, 'rewardId'),
    rewardTitle: text(source, 'rewardTitle'),
    restrictionId: maybeText(source, 'restrictionId'),
    xpSpent: num(source, 'xpSpent'),
    grantsBypass: flag(source, 'grantsBypass'),
    permissionUsed: flag(source, 'permissionUsed'),
    usedOnLocalDate: maybeText(source, 'usedOnLocalDate'),
    purchasedAt: text(source, 'purchasedAt'),
  };
}

function parseTransaction(value: unknown): DeskTransaction {
  const source = record(value, 'transaction');
  return {
    id: text(source, 'id'),
    amount: num(source, 'amount'),
    reason: oneOf(source, 'reason', XP_TRANSACTION_REASONS),
    balanceAfter: num(source, 'balanceAfter'),
    localDate: maybeText(source, 'localDate'),
    activityLogId: maybeText(source, 'activityLogId'),
    note: text(source, 'note'),
    createdAt: text(source, 'createdAt'),
  };
}

export async function loadAscentDesk(): Promise<AscentDesk | null> {
  const listed = await send('/api/ascent/challenges');
  const challenges = list(listed.challenges, 'challenges').map((item) => parseChallenge(item));
  const active = challenges.find((item) => item.status === 'active');
  if (!active) return null;

  const id = encodeURIComponent(active.id);
  const [detail, today, purchases, transactions, history] = await Promise.all([
    send(`/api/ascent/challenges/${id}`),
    send('/api/ascent/today'),
    send(`/api/ascent/rewards/purchases?challengeId=${id}`),
    send(`/api/ascent/xp/transactions?challengeId=${id}`),
    send(`/api/ascent/history?challengeId=${id}`),
  ]);

  const challenge = parseChallenge(detail.challenge);
  const todayChallenge = parseChallenge(today.challenge);
  return {
    challenge,
    localDate: text(today, 'localDate'),
    currentStreak: num(today, 'currentStreak'),
    bestStreak: num(today, 'bestStreak'),
    xpBalance: todayChallenge.xpBalance,
    xpEarnedTotal: todayChallenge.xpEarnedTotal,
    clock: parseClock(today.clock),
    debt: list(today.debt, 'debt').map(parseTodayDebt),
    rewards: list(detail.rewards, 'rewards').map(parseReward),
    triggers: list(detail.triggers, 'triggers').map(parseTrigger),
    habits: list(detail.habits, 'habits').map(parseHabitLink),
    restrictions: list(detail.restrictions, 'restrictions').map(parseRestriction),
    customDebts: list(detail.customDebts, 'customDebts').map(parseDebtDefinition),
    activities: list(detail.activities, 'activities').map(parseActivity),
    purchases: list(purchases.purchases, 'purchases').map(parsePurchase),
    transactions: list(transactions.transactions, 'transactions').map(parseTransaction),
    days: list(history.days, 'days').map((day) => {
      const source = record(day, 'day');
      return {
        localDate: text(source, 'localDate'),
        status: oneOf(source, 'status', CHALLENGE_DAY_STATUSES),
      };
    }),
  };
}

export function purchaseReward(challengeId: string, rewardId: string, body: { idempotencyKey: string; restrictionId?: string }) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/rewards/${encodeURIComponent(rewardId)}/purchases`,
    jsonInit('POST', body)
  );
}

export function applyPurchase(challengeId: string, purchaseId: string) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/purchases/${encodeURIComponent(purchaseId)}/use`,
    jsonInit('POST')
  );
}

export async function earnActivity(body: {
  activityId: string;
  challengeId: string;
  quantity: number;
  idempotencyKey: string;
}): Promise<{ xp: number; replayed: boolean }> {
  const payload = await send('/api/ascent/xp/earn', jsonInit('POST', body));
  return {
    xp: typeof payload.xp === 'number' ? payload.xp : 0,
    replayed: payload.replayed === true,
  };
}

export function reverseGrant(challengeId: string, logId: string) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/activity-logs/${encodeURIComponent(logId)}/reversal`,
    jsonInit('POST')
  );
}

export function patchChallenge(challengeId: string, body: Record<string, unknown>) {
  return send(`/api/ascent/challenges/${encodeURIComponent(challengeId)}`, jsonInit('PATCH', body));
}

export function createDeskReward(challengeId: string, body: Record<string, unknown>) {
  return send(`/api/ascent/challenges/${encodeURIComponent(challengeId)}/rewards`, jsonInit('POST', body));
}

export function patchDeskReward(challengeId: string, rewardId: string, body: Record<string, unknown>) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/rewards/${encodeURIComponent(rewardId)}`,
    jsonInit('PATCH', body)
  );
}

export function deleteDeskReward(challengeId: string, rewardId: string) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/rewards/${encodeURIComponent(rewardId)}`,
    { method: 'DELETE' }
  );
}

export function createDeskTrigger(challengeId: string, body: Record<string, unknown>) {
  return send(`/api/ascent/challenges/${encodeURIComponent(challengeId)}/triggers`, jsonInit('POST', body));
}

export function patchDeskTrigger(challengeId: string, triggerId: string, body: Record<string, unknown>) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/triggers/${encodeURIComponent(triggerId)}`,
    jsonInit('PATCH', body)
  );
}

export function deleteDeskTrigger(challengeId: string, triggerId: string) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/triggers/${encodeURIComponent(triggerId)}`,
    { method: 'DELETE' }
  );
}

export function createDeskRestriction(challengeId: string, body: Record<string, unknown>) {
  return send(`/api/ascent/challenges/${encodeURIComponent(challengeId)}/restrictions`, jsonInit('POST', body));
}

export function patchDeskRestriction(challengeId: string, restrictionId: string, body: Record<string, unknown>) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/restrictions/${encodeURIComponent(restrictionId)}`,
    jsonInit('PATCH', body)
  );
}

export function deleteDeskRestriction(challengeId: string, restrictionId: string) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/restrictions/${encodeURIComponent(restrictionId)}`,
    { method: 'DELETE' }
  );
}

export function createDeskDebt(challengeId: string, body: Record<string, unknown>) {
  return send(`/api/ascent/challenges/${encodeURIComponent(challengeId)}/custom-debts`, jsonInit('POST', body));
}

export function patchDeskDebt(challengeId: string, debtId: string, body: Record<string, unknown>) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/custom-debts/${encodeURIComponent(debtId)}`,
    jsonInit('PATCH', body)
  );
}

export function deleteDeskDebt(challengeId: string, debtId: string) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/custom-debts/${encodeURIComponent(debtId)}`,
    { method: 'DELETE' }
  );
}

export function createDeskActivity(challengeId: string, body: Record<string, unknown>) {
  return send(`/api/ascent/challenges/${encodeURIComponent(challengeId)}/xp-activities`, jsonInit('POST', body));
}

export function patchDeskActivity(activityId: string, body: Record<string, unknown>) {
  return send(`/api/ascent/xp/activities/${encodeURIComponent(activityId)}`, jsonInit('PATCH', body));
}

export function linkDeskHabit(challengeId: string, habitId: string) {
  return send(`/api/ascent/challenges/${encodeURIComponent(challengeId)}/habits`, jsonInit('POST', { habitId }));
}

export function unlinkDeskHabit(challengeId: string, linkId: string) {
  return send(
    `/api/ascent/challenges/${encodeURIComponent(challengeId)}/habits/${encodeURIComponent(linkId)}`,
    { method: 'DELETE' }
  );
}
