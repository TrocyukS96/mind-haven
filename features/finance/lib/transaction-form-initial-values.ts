import type { TransactionFormDraft } from '@/features/finance/lib/map-voice-to-finance-draft';
import type { FinanceCategoryKey } from '@/entities/finance/model/types';
import { getCategoriesByType } from '@/entities/finance/model/categories';

export interface TransactionFormValues {
  accountId: string;
  category: FinanceCategoryKey;
  amount: string;
  description: string;
  date: string;
}

export function buildTransactionFormValues(
  draft?: TransactionFormDraft | null,
  fallbackAccountId?: string | null
): TransactionFormValues {
  const type = draft?.type ?? 'expense';
  const defaultCategory = getCategoriesByType(type)[0].key;

  if (draft) {
    return {
      accountId: draft.accountId ?? fallbackAccountId ?? '',
      category: draft.category ?? defaultCategory,
      amount: draft.amount != null ? String(draft.amount) : '',
      description: draft.description ?? '',
      date: draft.date ?? new Date().toISOString().slice(0, 10),
    };
  }

  return {
    accountId: fallbackAccountId ?? '',
    category: defaultCategory,
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  };
}

export function getTransactionFormKey(
  draft?: TransactionFormDraft | null,
  editingId?: string | null
): string {
  if (editingId) {
    return `edit-${editingId}`;
  }

  if (draft) {
    return `voice-${draft.type}-${draft.amount ?? 0}-${draft.category ?? 'none'}`;
  }

  return 'new';
}
