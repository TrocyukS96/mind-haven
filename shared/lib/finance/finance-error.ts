export const FINANCE_ERROR_CODES = [
  'INVALID_AMOUNT',
  'INVALID_DATE',
  'INVALID_CURRENCY',
  'ACCOUNT_NAME_REQUIRED',
  'ACCOUNT_NOT_FOUND',
  'SAME_ACCOUNT',
  'INSUFFICIENT_FUNDS',
  'PARTIAL_TRANSFER',
  'CURRENCY_LOCKED',
  'BALANCE_LOCKED',
  'ARCHIVE_NONZERO',
  'ARCHIVE_REQUIRED',
  'NOT_CAPITAL_ACCOUNT',
  'NOT_REGULAR_ACCOUNT',
  'TRANSFER_NOT_FOUND',
  'TRANSACTION_NOT_FOUND',
  'GOAL_NOT_FOUND',
  'GOAL_NAME_REQUIRED',
  'GOAL_DATES',
  'DUPLICATE_REQUEST',
] as const;

export type FinanceErrorCode = (typeof FINANCE_ERROR_CODES)[number];

export class FinanceRuleError extends Error {
  readonly code: FinanceErrorCode;

  constructor(code: FinanceErrorCode) {
    super(code);
    this.name = 'FinanceRuleError';
    this.code = code;
  }
}

export function isFinanceRuleError(error: unknown): error is FinanceRuleError {
  return (
    error instanceof FinanceRuleError ||
    (error instanceof Error &&
      error.name === 'FinanceRuleError' &&
      FINANCE_ERROR_CODES.includes((error as FinanceRuleError).code))
  );
}
