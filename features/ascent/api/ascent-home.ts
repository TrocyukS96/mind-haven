import type { Habit } from '@/entities/habit/model/types';
import { fetchHabits } from '@/entities/habit/api/habit-client';
import {
  CHALLENGE_DAY_STATUSES,
  CHALLENGE_STATUSES,
  DEBT_ITEM_STATES,
  DEBT_SOURCES,
  RESTRICTION_KINDS,
  type ChallengeDayStatus,
  type ChallengeStatus,
  type DebtItemState,
  type DebtSource,
  type RestrictionKind,
} from '@/entities/ascent/model/types';
import type { AscentClock } from '@/shared/lib/ascent/abstinence';
import { AscentRequestError } from '@/features/ascent/api/ascent-client';

export interface AscentChallengeView {
  id: string;
  title: string;
  description: string;
  unwantedBehavior: string;
  targetDays: number;
  startsAt: string;
  status: ChallengeStatus;
  currentStreak: number;
  bestStreak: number;
  timezone: string;
  xpBalance: number;
  xpEarnedTotal: number;
  updatedAt: string;
}

export interface AscentDebtView {
  id: string;
  source: DebtSource;
  sourceId: string;
  title: string;
  required: boolean;
  state: DebtItemState;
  confirmedByUser: boolean;
  sortOrder: number;
}

export interface AscentRestrictionView {
  id: string;
  title: string;
  kind: RestrictionKind;
  unlockAfterSuccessfulDays: number;
  rewardId: string | null;
  required: boolean;
  bypassable: boolean;
  active: boolean;
  sortOrder: number;
}

export interface AscentRewardView {
  id: string;
  title: string;
  xpCost: number;
  active: boolean;
}

export interface AscentTodayView {
  challenge: AscentChallengeView;
  localDate: string;
  currentStreak: number;
  bestStreak: number;
  xpBalance: number;
  xpEarnedTotal: number;
  debt: AscentDebtView[];
  restrictions: AscentRestrictionView[];
  previewStatus: 'pending' | 'successful' | 'failed';
  clock: AscentClock;
}

export interface AscentHistoryView {
  challenge: AscentChallengeView;
  localDate: string;
  clock: AscentClock;
  days: { localDate: string; status: ChallengeDayStatus }[];
}

export interface AscentBoardView {
  rewards: AscentRewardView[];
  restrictions: AscentRestrictionView[];
  habits: { id: string; targetCount: number | null }[];
}

export type AscentScreenData =
  | { kind: 'welcome'; past: AscentChallengeView[] }
  | { kind: 'scheduled'; today: AscentTodayView; history: AscentHistoryView; board: AscentBoardView }
  | {
      kind: 'active';
      today: AscentTodayView;
      history: AscentHistoryView;
      board: AscentBoardView;
      habits: Habit[];
    }
  | {
      kind: 'completed';
      challenge: AscentChallengeView;
      localDate: string;
      clock: AscentClock;
      days: AscentHistoryView['days'];
      board: AscentBoardView;
      past: AscentChallengeView[];
    };

const CLOCK_MODES = ['countdown', 'running', 'broken', 'frozen'] as const;

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

function parseClock(value: unknown): AscentClock {
  const source = record(value, 'clock');
  return {
    mode: oneOf(source, 'mode', CLOCK_MODES),
    startedAt: maybeText(source, 'startedAt'),
    boundaryAt: maybeText(source, 'boundaryAt'),
  };
}

function parseChallenge(value: unknown): AscentChallengeView {
  const source = record(value, 'challenge');
  return {
    id: text(source, 'id'),
    title: text(source, 'title'),
    description: text(source, 'description'),
    unwantedBehavior: text(source, 'unwantedBehavior'),
    targetDays: num(source, 'targetDays'),
    startsAt: text(source, 'startsAt'),
    status: oneOf(source, 'status', CHALLENGE_STATUSES),
    currentStreak: num(source, 'currentStreak'),
    bestStreak: num(source, 'bestStreak'),
    timezone: text(source, 'timezone'),
    xpBalance: num(source, 'xpBalance'),
    xpEarnedTotal: num(source, 'xpEarnedTotal'),
    updatedAt: text(source, 'updatedAt'),
  };
}

function parseDebt(value: unknown): AscentDebtView {
  const source = record(value, 'debt');
  return {
    id: text(source, 'id'),
    source: oneOf(source, 'source', DEBT_SOURCES),
    sourceId: text(source, 'sourceId'),
    title: text(source, 'title'),
    required: flag(source, 'required'),
    state: oneOf(source, 'state', DEBT_ITEM_STATES),
    confirmedByUser: flag(source, 'confirmedByUser'),
    sortOrder: num(source, 'sortOrder'),
  };
}

function parseRestriction(value: unknown): AscentRestrictionView {
  const source = record(value, 'restriction');
  return {
    id: text(source, 'id'),
    title: text(source, 'title'),
    kind: oneOf(source, 'kind', RESTRICTION_KINDS),
    unlockAfterSuccessfulDays: num(source, 'unlockAfterSuccessfulDays'),
    rewardId: maybeText(source, 'rewardId'),
    required: flag(source, 'required'),
    bypassable: flag(source, 'bypassable'),
    active: flag(source, 'active'),
    sortOrder: num(source, 'sortOrder'),
  };
}

function parseReward(value: unknown): AscentRewardView {
  const source = record(value, 'reward');
  return {
    id: text(source, 'id'),
    title: text(source, 'title'),
    xpCost: num(source, 'xpCost'),
    active: flag(source, 'active'),
  };
}

function parseToday(body: Record<string, unknown>): AscentTodayView {
  const preview = record(body.preview, 'preview');
  const debt = body.debt;
  const restrictions = body.restrictions;
  if (!Array.isArray(debt) || !Array.isArray(restrictions)) malformed('today');
  return {
    challenge: parseChallenge(body.challenge),
    localDate: text(body, 'localDate'),
    currentStreak: num(body, 'currentStreak'),
    bestStreak: num(body, 'bestStreak'),
    xpBalance: num(body, 'xpBalance'),
    xpEarnedTotal: num(body, 'xpEarnedTotal'),
    debt: debt.map(parseDebt),
    restrictions: restrictions.map(parseRestriction),
    previewStatus: oneOf(preview, 'status', ['pending', 'successful', 'failed'] as const),
    clock: parseClock(body.clock),
  };
}

function parseHistory(body: Record<string, unknown>): AscentHistoryView {
  const days = body.days;
  if (!Array.isArray(days)) malformed('history');
  return {
    challenge: parseChallenge(body.challenge),
    localDate: text(body, 'localDate'),
    clock: parseClock(body.clock),
    days: days.map((day) => {
      const source = record(day, 'day');
      return {
        localDate: text(source, 'localDate'),
        status: oneOf(source, 'status', CHALLENGE_DAY_STATUSES),
      };
    }),
  };
}

function parseBoard(body: Record<string, unknown>): AscentBoardView {
  const rewards = body.rewards;
  const restrictions = body.restrictions;
  const habits = body.habits;
  if (!Array.isArray(rewards) || !Array.isArray(restrictions) || !Array.isArray(habits)) malformed('board');
  return {
    rewards: rewards.map(parseReward).filter((reward) => reward.active),
    restrictions: restrictions.map(parseRestriction),
    habits: habits.map((item) => {
      const source = record(item, 'habitLink');
      const habit = source.habit == null ? null : record(source.habit, 'habit');
      const id = habit ? text(habit, 'id') : text(source, 'habitId');
      const targetCount = habit?.targetCount;
      return {
        id,
        targetCount: typeof targetCount === 'number' ? targetCount : null,
      };
    }),
  };
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = (await response.json()) as unknown;
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function getJson(url: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(url);
  const body = await readBody(response);
  if (!response.ok && response.status !== 404) {
    const message = typeof body.error === 'string' ? body.error : 'Request failed';
    const code = typeof body.code === 'string' ? body.code : null;
    throw new AscentRequestError(message, response.status, code);
  }
  return { status: response.status, body };
}

export async function confirmAscentDebt(id: string, confirmed: boolean): Promise<void> {
  const response = await fetch(`/api/ascent/debts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmed }),
  });
  const body = await readBody(response);
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : 'Request failed';
    const code = typeof body.code === 'string' ? body.code : null;
    throw new AscentRequestError(message, response.status, code);
  }
}

export async function loadAscentHistory(challengeId: string): Promise<AscentHistoryView> {
  const result = await getJson(`/api/ascent/history?challengeId=${encodeURIComponent(challengeId)}`);
  if (result.status === 404) throw new AscentRequestError('Not found', 404, 'not_found');
  return parseHistory(result.body);
}

async function loadBoard(challengeId: string): Promise<AscentBoardView> {
  const result = await getJson(`/api/ascent/challenges/${encodeURIComponent(challengeId)}`);
  if (result.status === 404) throw new AscentRequestError('Not found', 404, 'not_found');
  return parseBoard(result.body);
}

async function loadChallengeList(): Promise<AscentChallengeView[]> {
  const result = await getJson('/api/ascent/challenges');
  const challenges = result.body.challenges;
  if (!Array.isArray(challenges)) malformed('challenges');
  return challenges.map(parseChallenge);
}

async function loadHabits(): Promise<Habit[]> {
  try {
    return await fetchHabits();
  } catch {
    return [];
  }
}

function byUpdatedDesc(left: AscentChallengeView, right: AscentChallengeView): number {
  return right.updatedAt.localeCompare(left.updatedAt);
}

export async function loadAscentHome(): Promise<AscentScreenData> {
  const todayResult = await getJson('/api/ascent/today');
  if (todayResult.status !== 404) {
    const today = parseToday(todayResult.body);
    const [history, board, habits] = await Promise.all([
      loadAscentHistory(today.challenge.id),
      loadBoard(today.challenge.id),
      loadHabits(),
    ]);
    if (today.clock.mode === 'countdown') return { kind: 'scheduled', today, history, board };
    if (today.challenge.status !== 'active') {
      return {
        kind: 'completed',
        challenge: today.challenge,
        localDate: today.localDate,
        clock: today.clock,
        days: history.days,
        board,
        past: [],
      };
    }
    return { kind: 'active', today, history, board, habits };
  }

  const challenges = await loadChallengeList();
  const past = challenges
    .filter((item) => item.status === 'completed' || item.status === 'archived')
    .sort(byUpdatedDesc);
  const completed = past.find((item) => item.status === 'completed');
  if (!completed) return { kind: 'welcome', past };

  const [history, board] = await Promise.all([loadAscentHistory(completed.id), loadBoard(completed.id)]);
  return {
    kind: 'completed',
    challenge: history.challenge,
    localDate: history.localDate,
    clock: history.clock,
    days: history.days,
    board,
    past: past.filter((item) => item.id !== completed.id),
  };
}
