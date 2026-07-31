'use client';

import { getCategoriesByType } from '@/entities/finance/model/categories';
import type {
  FinanceCategoryKey,
  FinanceTransaction,
  TransactionType,
} from '@/entities/finance/model/types';
import {
  buildTransactionFormValues,
} from '@/features/finance/lib/transaction-form-initial-values';
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
import { Textarea } from '@/shared/ui/textarea';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface TransactionFormProps {
  type: TransactionType;
  transaction?: FinanceTransaction | null;
  onSuccess?: () => void;
}

export function TransactionForm({ type, transaction = null, onSuccess }: TransactionFormProps) {
  const t = useTranslations('finance');
  const isEditing = Boolean(transaction);
  const {
    financeAccounts,
    selectedAccountId,
    transactionFormDraft,
    addFinanceTransaction,
    updateFinanceTransaction,
  } = useStore();
  const categories = getCategoriesByType(type);

  const initialValues = buildTransactionFormValues(
    isEditing ? null : transactionFormDraft,
    transaction?.accountId ?? selectedAccountId ?? financeAccounts[0]?.id ?? null
  );

  const [accountId, setAccountId] = useState(
    transaction?.accountId ?? initialValues.accountId
  );
  const [category, setCategory] = useState<FinanceCategoryKey>(
    transaction?.category ?? initialValues.category
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : initialValues.amount
  );
  const [description, setDescription] = useState(
    transaction?.description ?? initialValues.description
  );
  const [date, setDate] = useState(transaction?.date ?? initialValues.date);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId) {
      toast.error(t('noAccountError'));
      return;
    }

    setLoading(true);

    const payload = {
      accountId,
      type,
      amount: parseFloat(amount),
      category,
      description,
      date,
    };

    try {
      if (isEditing && transaction) {
        await updateFinanceTransaction(transaction.id, payload);
        toast.success(t('transactionUpdated'));
      } else {
        await addFinanceTransaction(payload);
        toast.success(type === 'expense' ? t('expenseAdded') : t('incomeAdded'));
        setAmount('');
        setDescription('');
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
        <Label>{t('account')}</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectAccount')} />
          </SelectTrigger>
          <SelectContent>
            {financeAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('category')}</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:bg-accent'
                )}
              >
                <div
                  className={cn('flex h-9 w-9 items-center justify-center rounded-full', cat.bgColor)}
                >
                  <Icon size={18} style={{ color: cat.color }} />
                </div>
                <span className="text-center leading-tight">{t(`categories.${cat.key}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">{t('amount')}</Label>
        <Input
          id="amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">{t('date')}</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('description')}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {isEditing
          ? t('saveTransaction')
          : type === 'expense'
            ? t('addExpense')
            : t('addIncome')}
      </Button>
    </form>
  );
}
