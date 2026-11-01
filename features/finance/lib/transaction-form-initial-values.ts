import type { TransactionFormDraft } from '@/features/finance/lib/map-voice-to-finance-draft';
import type {
  FinanceAccount,
  FinanceCategoryKey,
  TransactionType,
} from '@/entities/finance/model/types';
import { getCategoriesByType } from '@/entities/finance/model/categories';

export interface TransactionFormValues {
  accountId: string;
  category: FinanceCategoryKey;
  amount: string;
  description: string;
  date: string;
}

export function toLocalIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftLocalIsoDate(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

export function buildTransactionFormValues(
  draft?: TransactionFormDraft | null,
  fallbackAccountId?: string | null,
  fallbackType: TransactionType = 'expense'
): TransactionFormValues {
  const type = draft?.type ?? fallbackType;
  const defaultCategory = getCategoriesByType(type)[0].key;

  if (draft) {
    return {
      accountId: draft.accountId ?? fallbackAccountId ?? '',
      category: draft.category ?? defaultCategory,
      amount: draft.amount != null ? String(draft.amount) : '',
      description: draft.description ?? '',
      date: draft.date ?? toLocalIsoDate(),
    };
  }

  return {
    accountId: fallbackAccountId ?? '',
    category: defaultCategory,
    amount: '',
    description: '',
    date: toLocalIsoDate(),
  };
}

export function orderAccountsDefaultFirst(accounts: FinanceAccount[]): FinanceAccount[] {
  return [...accounts].sort((left, right) => Number(right.isDefault) - Number(left.isDefault));
}

export function resolveNewTransactionAccountId(
  accounts: FinanceAccount[],
  draftAccountId?: string | null
): string {
  if (draftAccountId && accounts.some((account) => account.id === draftAccountId)) {
    return draftAccountId;
  }

  const defaultAccount = accounts.find((account) => account.isDefault);
  if (defaultAccount) return defaultAccount.id;
  if (accounts.length === 1) return accounts[0].id;
  return '';
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
