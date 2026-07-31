import type { ParsedFinanceVoiceResult } from '@/shared/lib/voice/parsers/finance-parser';
import type { FinanceCategoryKey, TransactionType } from '@/entities/finance/model/types';

export interface TransactionFormDraft {
  type: TransactionType;
  accountId?: string;
  category?: FinanceCategoryKey;
  amount?: number;
  description?: string;
  date?: string;
}

export function mapVoiceResultToFinanceDraft(
  parsed: ParsedFinanceVoiceResult
): TransactionFormDraft {
  return {
    type: parsed.type,
    accountId: parsed.accountId ?? undefined,
    category: parsed.category,
    amount: parsed.amount,
    description: parsed.description ?? undefined,
    date: parsed.date ?? undefined,
  };
}
