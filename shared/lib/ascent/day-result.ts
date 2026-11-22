import type {
  DayFailureReason,
  DebtItemState,
  DebtSource,
  RestrictionKind,
} from '@/entities/ascent/model/types';

export interface HabitObligationInput {
  id: string;
  title: string;
  required: boolean;
  scheduled: boolean;
  met: boolean;
  sortOrder: number;
}

export interface RestrictionObligationInput {
  id: string;
  title: string;
  kind: RestrictionKind;
  required: boolean;
  active: boolean;
  bypassable: boolean;
  unlockAfterSuccessfulDays: number;
  honored: boolean;
  violated: boolean;
  bypassed: boolean;
  sortOrder: number;
}

export interface CustomObligationInput {
  id: string;
  title: string;
  required: boolean;
  active: boolean;
  confirmed: boolean;
  sortOrder: number;
}

export interface DebtItemResult {
  source: DebtSource;
  sourceId: string;
  title: string;
  required: boolean;
  state: DebtItemState;
  failureReason: DayFailureReason | null;
  confirmedByUser: boolean;
  sortOrder: number;
}

export interface DayEvaluation {
  status: 'pending' | 'successful' | 'failed';
  debtClosed: boolean;
  obligationsMet: boolean;
  failureReason: DayFailureReason | null;
  items: DebtItemResult[];
}

const CLOSED_STATES: readonly DebtItemState[] = ['satisfied', 'bypassed', 'not_applicable'];

function isClosed(item: DebtItemResult): boolean {
  return !item.required || CLOSED_STATES.includes(item.state);
}

function habitItem(input: HabitObligationInput, finalize: boolean): DebtItemResult {
  if (!input.scheduled) {
    return {
      source: 'habit',
      sourceId: input.id,
      title: input.title,
      required: input.required,
      state: 'not_applicable',
      failureReason: null,
      confirmedByUser: false,
      sortOrder: input.sortOrder,
    };
  }

  if (input.met) {
    return {
      source: 'habit',
      sourceId: input.id,
      title: input.title,
      required: input.required,
      state: 'satisfied',
      failureReason: null,
      confirmedByUser: true,
      sortOrder: input.sortOrder,
    };
  }

  return {
    source: 'habit',
    sourceId: input.id,
    title: input.title,
    required: input.required,
    state: finalize ? 'missed' : 'pending',
    failureReason: 'habit_unmet',
    confirmedByUser: false,
    sortOrder: input.sortOrder,
  };
}

function restrictionItem(
  input: RestrictionObligationInput,
  streakAtStart: number,
  finalize: boolean
): DebtItemResult {
  const base = {
    source: 'restriction' as const,
    sourceId: input.id,
    title: input.title,
    required: input.required,
    sortOrder: input.sortOrder,
  };

  // Zero keeps the restriction for the whole challenge. A positive threshold lifts it
  // once the streak at the start of the day reaches that many successful days.
  const lifted =
    input.unlockAfterSuccessfulDays > 0 && streakAtStart >= input.unlockAfterSuccessfulDays;
  if (!input.active || lifted) {
    return { ...base, state: 'not_applicable', failureReason: null, confirmedByUser: false };
  }

  const legitBypass = input.bypassed && input.bypassable && input.kind !== 'core_behavior';
  if (input.violated && !legitBypass) {
    return { ...base, state: 'missed', failureReason: 'restriction_violated', confirmedByUser: true };
  }

  if (legitBypass) {
    return { ...base, state: 'bypassed', failureReason: null, confirmedByUser: true };
  }

  if (input.honored) {
    return { ...base, state: 'satisfied', failureReason: null, confirmedByUser: true };
  }

  return {
    ...base,
    state: finalize ? 'missed' : 'pending',
    failureReason: 'restriction_unconfirmed',
    confirmedByUser: false,
  };
}

function customItem(input: CustomObligationInput, finalize: boolean): DebtItemResult {
  const base = {
    source: 'custom' as const,
    sourceId: input.id,
    title: input.title,
    required: input.required,
    sortOrder: input.sortOrder,
  };

  if (!input.active) {
    return { ...base, state: 'not_applicable', failureReason: null, confirmedByUser: false };
  }

  if (input.confirmed) {
    return { ...base, state: 'satisfied', failureReason: null, confirmedByUser: true };
  }

  return {
    ...base,
    state: finalize ? 'missed' : 'pending',
    failureReason: 'debt_unconfirmed',
    confirmedByUser: false,
  };
}

const SOURCE_RANK: Record<DebtSource, number> = { habit: 0, restriction: 1, custom: 2 };

function compareItems(left: DebtItemResult, right: DebtItemResult): number {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  if (SOURCE_RANK[left.source] !== SOURCE_RANK[right.source]) {
    return SOURCE_RANK[left.source] - SOURCE_RANK[right.source];
  }
  if (left.sourceId < right.sourceId) return -1;
  if (left.sourceId > right.sourceId) return 1;
  return 0;
}

/**
 * Decides one local day from obligations that already belong to that date.
 * Unfinished items are not carried to the next date.
 * A restriction with a positive `unlockAfterSuccessfulDays` stops once the streak
 * at the start of the day reaches that count. Zero means the restriction never expires.
 * A day stays pending until `finalize` so a still-open day cannot grow the streak.
 * An explicit restriction violation is already a failure during the day.
 */
export function evaluateDay(input: {
  streakAtStart: number;
  finalize: boolean;
  habits?: readonly HabitObligationInput[];
  restrictions?: readonly RestrictionObligationInput[];
  customs?: readonly CustomObligationInput[];
}): DayEvaluation {
  const items = [
    ...(input.habits ?? []).map((item) => habitItem(item, input.finalize)),
    ...(input.restrictions ?? []).map((item) => restrictionItem(item, input.streakAtStart, input.finalize)),
    ...(input.customs ?? []).map((item) => customItem(item, input.finalize)),
  ].sort(compareItems);

  const blocking = items.filter((item) => !isClosed(item));
  const debtClosed = blocking.length === 0;

  if (!input.finalize) {
    const violation = blocking.find((item) => item.failureReason === 'restriction_violated');
    if (violation) {
      return {
        status: 'failed',
        debtClosed: false,
        obligationsMet: false,
        failureReason: 'restriction_violated',
        items,
      };
    }

    return {
      status: 'pending',
      debtClosed,
      obligationsMet: debtClosed,
      failureReason: null,
      items,
    };
  }

  if (debtClosed) {
    return {
      status: 'successful',
      debtClosed: true,
      obligationsMet: true,
      failureReason: null,
      items,
    };
  }

  return {
    status: 'failed',
    debtClosed: false,
    obligationsMet: false,
    failureReason: blocking[0]?.failureReason ?? 'obligations_unmet',
    items,
  };
}

export function missedDayEvaluation(): DayEvaluation {
  return {
    status: 'failed',
    debtClosed: false,
    obligationsMet: false,
    failureReason: 'obligations_unmet',
    items: [],
  };
}
