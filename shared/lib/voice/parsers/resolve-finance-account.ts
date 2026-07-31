import type { FinanceCurrency } from '@/entities/finance/model/types';
import type { VoiceAccountOption } from '../types';

function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/["«»]/g, '')
    .replace(/\s+/g, ' ');
}

export function resolveFinanceAccountId(
  accountId: string | null | undefined,
  accountName: string | null | undefined,
  currency: FinanceCurrency | null | undefined,
  accounts: VoiceAccountOption[]
): string | null {
  if (!accounts.length) {
    return null;
  }

  const trimmedId = typeof accountId === 'string' ? accountId.trim() : '';
  if (trimmedId && accounts.some((account) => account.id === trimmedId)) {
    return trimmedId;
  }

  let candidates = accounts;

  if (currency && ['BYN', 'RUB', 'USD', 'CNY'].includes(currency)) {
    const byCurrency = accounts.filter((account) => account.currency === currency);
    if (byCurrency.length === 1) {
      return byCurrency[0].id;
    }
    if (byCurrency.length > 1) {
      candidates = byCurrency;
    }
  }

  const searchName = typeof accountName === 'string' ? accountName.trim() : '';
  if (!searchName) {
    if (candidates.length === 1) {
      return candidates[0].id;
    }
    return null;
  }

  const normalizedSearch = normalizeForMatch(searchName);

  const exactMatch = candidates.find(
    (account) => normalizeForMatch(account.name) === normalizedSearch
  );
  if (exactMatch) {
    return exactMatch.id;
  }

  const includesMatches = candidates.filter((account) => {
    const normalizedName = normalizeForMatch(account.name);
    return (
      normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName)
    );
  });

  if (includesMatches.length === 1) {
    return includesMatches[0].id;
  }

  return null;
}
