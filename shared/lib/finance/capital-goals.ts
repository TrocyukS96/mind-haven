import type {
  FinanceBooks,
  FinanceCapitalGoal,
  GoalPeriodPreset,
} from '@/entities/finance/model/types';
import { listCapitalFlows, capitalValueAt } from './capital-analytics';
import { money } from './decimal';
import {
  addValued,
  convertAmount,
  zeroValued,
  type RateBook,
  type ValuedAmount,
} from './historical-rates';

export interface GoalProgress {
  current: ValuedAmount;
  percent: number | null;
  barPercent: number;
  remaining: number | null;
  daysLeft: number;
  monthsLeft: number | null;
  recommendedMonthly: number | null;
  frozen: boolean;
}

function utcDate(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function isoFromUtc(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function monthEnd(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

function monthStart(month: string): string {
  return `${month}-01`;
}

export function suggestGoalDates(
  preset: GoalPeriodPreset,
  anchor: string
): { startDate: string; endDate: string } {
  const month = anchor.slice(0, 7);
  const monthNumber = Number(anchor.slice(5, 7));

  if (preset === 'month') {
    return { startDate: monthStart(month), endDate: monthEnd(month) };
  }

  if (preset === 'quarter') {
    const quarterStartMonth = Math.floor((monthNumber - 1) / 3) * 3 + 1;
    const start = `${anchor.slice(0, 4)}-${String(quarterStartMonth).padStart(2, '0')}`;
    return { startDate: monthStart(start), endDate: monthEnd(shiftMonth(start, 2)) };
  }

  if (preset === 'half') {
    const startMonth = monthNumber <= 6 ? '01' : '07';
    const start = `${anchor.slice(0, 4)}-${startMonth}`;
    return { startDate: monthStart(start), endDate: monthEnd(shiftMonth(start, 5)) };
  }

  if (preset === 'year') {
    const year = anchor.slice(0, 4);
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }

  if (preset === 'five_years') {
    const end = new Date(utcDate(anchor));
    end.setUTCFullYear(end.getUTCFullYear() + 5);
    end.setUTCDate(end.getUTCDate() - 1);
    return { startDate: anchor, endDate: isoFromUtc(end.getTime()) };
  }

  return { startDate: anchor, endDate: anchor };
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
}

function monthsBetween(today: string, endDate: string): number {
  const start = today.slice(0, 7);
  const end = endDate.slice(0, 7);
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  return Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
}

export function goalProgress(
  goal: FinanceCapitalGoal,
  books: FinanceBooks,
  book: RateBook
): GoalProgress {
  const today = book.today;
  const frozen = today > goal.endDate;
  const asOf = frozen ? goal.endDate : today;
  let current: ValuedAmount = zeroValued();

  if (goal.goalType === 'capital_target') {
    current = capitalValueAt(books, asOf, goal.currency, book);
  } else if (today >= goal.startDate) {
    const flows = listCapitalFlows(books).filter(
      (flow) =>
        (flow.kind === 'contribution' || flow.kind === 'withdrawal') &&
        flow.date >= goal.startDate &&
        flow.date <= goal.endDate &&
        flow.date <= today
    );
    current = zeroValued();
    for (const flow of flows) {
      const converted = convertAmount(flow.amount, flow.currency, goal.currency, flow.date, book);
      if (converted.amount == null) {
        current = { amount: null, approximate: current.approximate, rateDate: null };
        break;
      }
      current = addValued(current, {
        ...converted,
        amount: converted.amount * flow.sign,
      });
    }
  }

  const target = goal.targetAmount;
  const percent = current.amount == null || target === 0 ? null : (current.amount / target) * 100;
  const barPercent = percent == null ? 0 : Math.min(100, Math.max(0, percent));
  const remaining =
    current.amount == null ? null : Number(money(Math.max(0, target - current.amount)));
  const daysLeft = Math.max(0, Math.round((utcDate(goal.endDate) - utcDate(today)) / 86_400_000));
  const active = today <= goal.endDate;
  const monthsLeft = active ? monthsBetween(today < goal.startDate ? goal.startDate : today, goal.endDate) : null;
  const recommendedMonthly =
    active && remaining != null && monthsLeft
      ? Number(money(remaining / monthsLeft))
      : null;

  return {
    current,
    percent,
    barPercent,
    remaining,
    daysLeft,
    monthsLeft,
    recommendedMonthly,
    frozen,
  };
}
