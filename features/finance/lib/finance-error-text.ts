import { FINANCE_ERROR_CODES, type FinanceErrorCode } from '@/shared/lib/finance/finance-error';

export function financeErrorText(error: unknown, t: (key: string) => string): string {
  const code = error instanceof Error ? error.message : '';
  if ((FINANCE_ERROR_CODES as readonly string[]).includes(code)) {
    return t(`errors.${code as FinanceErrorCode}`);
  }
  return t('saveError');
}
