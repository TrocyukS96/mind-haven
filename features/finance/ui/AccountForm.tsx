'use client';

import { FINANCE_CURRENCIES } from '@/entities/finance/model/categories';
import type { FinanceAccount, FinanceCurrency } from '@/entities/finance/model/types';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface AccountFormProps {
  account?: FinanceAccount | null;
  onSuccess?: () => void;
}

export function AccountForm({ account = null, onSuccess }: AccountFormProps) {
  const t = useTranslations('finance');
  const isEditing = Boolean(account);
  const { addFinanceAccount, updateFinanceAccount, financeTransactions } = useStore();
  const hasTransactions =
    account != null && financeTransactions.some((tx) => tx.accountId === account.id);

  const [name, setName] = useState(account?.name ?? '');
  const [currency, setCurrency] = useState<FinanceCurrency>(account?.currency ?? 'BYN');
  const [initialBalance, setInitialBalance] = useState(
    account != null ? String(account.initialBalance) : ''
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      currency,
      initialBalance: initialBalance ? parseFloat(initialBalance) : 0,
    };

    try {
      if (isEditing && account) {
        await updateFinanceAccount(account.id, payload);
        toast.success(t('accountUpdated'));
      } else {
        await addFinanceAccount(payload);
        toast.success(t('accountCreated'));
        setName('');
        setInitialBalance('');
      }
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="account-name">{t('accountName')}</Label>
        <Input
          id="account-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('accountNamePlaceholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>{t('currency')}</Label>
        <Select
          value={currency}
          onValueChange={(v) => setCurrency(v as FinanceCurrency)}
          disabled={isEditing && hasTransactions}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FINANCE_CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`currencies.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isEditing && hasTransactions && (
          <p className="text-xs text-muted-foreground">{t('currencyLockedHint')}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="initial-balance">{t('initialBalance')}</Label>
        <Input
          id="initial-balance"
          type="number"
          min="0"
          step="0.01"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          placeholder="0"
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {isEditing ? t('saveAccount') : t('createAccount')}
      </Button>
    </form>
  );
}
