'use client';

import type { FinanceAccount, FinanceTransaction } from '@/entities/finance/model/types';
import { CURRENCY_SYMBOLS, getCategoryDefinition } from '@/entities/finance/model/categories';
import { convertCurrency } from '@/entities/finance/lib/currency-converter';
import { useFinanceSync } from '@/features/finance/hooks/use-finance-sync';
import { useExchangeRates } from '@/features/finance/hooks/use-exchange-rates';
import { FinanceDonutChart } from '@/features/finance/ui/FinanceDonutChart';
import { CategoryBreakdownList } from '@/features/finance/ui/CategoryBreakdownList';
import { DisplayCurrencySelector } from '@/features/finance/ui/DisplayCurrencySelector';
import { FinanceVoiceButton } from '@/features/finance/ui/FinanceVoiceButton';
import { AccountDeleteButton } from '@/features/finance/ui/AccountDeleteButton';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import {
  filterTransactionsByPeriod,
  getAccountBalanceConverted,
  getCategoryBreakdown,
  getCategoryBreakdownConverted,
  getPeriodRange,
  getTotalBalanceConverted,
} from '@/shared/store/slices/finance-slice';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Trash2,
  Wallet,
  Pencil,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

interface FinancePageProps {
  initialAccounts?: FinanceAccount[] | null;
  initialTransactions?: FinanceTransaction[] | null;
}

export function FinancePage({
  initialAccounts = null,
  initialTransactions = null,
}: FinancePageProps) {
  const hydrated = useStoreHydrated();
  useFinanceSync({ initialAccounts, initialTransactions });
  const { rates, loading: ratesLoading, error: ratesError } = useExchangeRates();

  const {
    financeAccounts,
    financeTransactions,
    selectedAccountId,
    setSelectedAccountId,
    financePeriod,
    setFinancePeriod,
    financeViewType,
    setFinanceViewType,
    displayCurrency,
    setDisplayCurrency,
    openAccountForm,
    openAccountFormForEdit,
    openTransactionForm,
    openTransactionFormForEdit,
    deleteFinanceTransaction,
  } = useStore();

  const t = useTranslations('finance');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;

  const [referenceDate, setReferenceDate] = useState(new Date());

  const selectedAccount = financeAccounts.find((a) => a.id === selectedAccountId) ?? null;
  const displaySymbol = CURRENCY_SYMBOLS[displayCurrency] ?? displayCurrency;

  const accountTransactions = useMemo(
    () =>
      selectedAccountId
        ? financeTransactions.filter((tx) => tx.accountId === selectedAccountId)
        : financeTransactions,
    [financeTransactions, selectedAccountId]
  );

  const periodTransactions = useMemo(
    () => filterTransactionsByPeriod(accountTransactions, financePeriod, referenceDate),
    [accountTransactions, financePeriod, referenceDate]
  );

  const breakdown = useMemo(() => {
    if (!rates) {
      return getCategoryBreakdown(periodTransactions, financeViewType);
    }

    const accountsForConversion = selectedAccount ? [selectedAccount] : financeAccounts;

    return getCategoryBreakdownConverted(
      periodTransactions,
      accountsForConversion,
      financeViewType,
      displayCurrency,
      rates
    );
  }, [
    periodTransactions,
    financeViewType,
    rates,
    selectedAccount,
    financeAccounts,
    displayCurrency,
  ]);

  const periodTotal = useMemo(
    () => breakdown.reduce((sum, item) => sum + item.amount, 0),
    [breakdown]
  );

  const totalBalance = useMemo(() => {
    if (!rates) {
      if (selectedAccount) return selectedAccount.balance;
      const currencies = new Set(financeAccounts.map((a) => a.currency));
      if (currencies.size > 1) return null;
      return financeAccounts.reduce((sum, a) => sum + a.balance, 0);
    }

    if (selectedAccount) {
      return getAccountBalanceConverted(selectedAccount, displayCurrency, rates);
    }

    return getTotalBalanceConverted(financeAccounts, displayCurrency, rates);
  }, [financeAccounts, selectedAccount, displayCurrency, rates]);

  const { start, end } = getPeriodRange(financePeriod, referenceDate);
  const periodLabel =
    financePeriod === 'day'
      ? format(referenceDate, 'd MMM yyyy', { locale: dateLocale })
      : `${format(start, 'd MMM', { locale: dateLocale })} – ${format(end, 'd MMM', { locale: dateLocale })}`;

  const shiftPeriod = (direction: -1 | 1) => {
    const next = new Date(referenceDate);
    switch (financePeriod) {
      case 'day':
        next.setDate(next.getDate() + direction);
        break;
      case 'week':
        next.setDate(next.getDate() + direction * 7);
        break;
      case 'month':
        next.setMonth(next.getMonth() + direction);
        break;
      case 'year':
        next.setFullYear(next.getFullYear() + direction);
        break;
    }
    setReferenceDate(next);
  };

  const getTransactionDisplayAmount = (tx: FinanceTransaction) => {
    const account = financeAccounts.find((a) => a.id === tx.accountId);
    const accountCurrency = account?.currency ?? 'BYN';

    if (!rates || accountCurrency === displayCurrency) {
      return { amount: tx.amount, symbol: CURRENCY_SYMBOLS[accountCurrency] ?? accountCurrency };
    }

    return {
      amount: convertCurrency(tx.amount, accountCurrency, displayCurrency, rates),
      symbol: displaySymbol,
    };
  };

  const recentTransactions = periodTransactions.slice(0, 10);

  if (!hydrated) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded bg-muted" />
        <div className="h-48 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
      </div>
    );
  }

  if (financeAccounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1>{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <EmptyState title={t('noAccounts')} description={t('noAccountsDescription')}>
          <Button onClick={() => openAccountForm()} className="mt-2">
            <Plus size={20} />
            {t('createAccount')}
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1>{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FinanceVoiceButton />
          <Button variant="outline" onClick={() => openAccountForm()}>
            <Wallet size={18} />
            {t('newAccount')}
          </Button>
          <Button
            variant="default"
            onClick={() => openTransactionForm('expense')}
            className="bg-destructive hover:bg-destructive/90"
          >
            <Minus size={18} />
            {t('expense')}
          </Button>
          <Button onClick={() => openTransactionForm('income')}>
            <Plus size={18} />
            {t('income')}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-700 to-emerald-900 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm opacity-80">{t('totalBalance')}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {totalBalance === null
                  ? t('ratesLoading')
                  : `${totalBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} ${displaySymbol}`}
              </p>
              {!selectedAccountId && financeAccounts.length > 1 && rates && (
                <p className="mt-1 text-xs opacity-70">{t('balanceConvertedHint')}</p>
              )}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[14rem]">
              <p className="text-sm opacity-80">{t('account')}</p>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedAccountId ?? 'all'}
                  onValueChange={(value) =>
                    setSelectedAccountId(value === 'all' ? null : value)
                  }
                >
                  <SelectTrigger
                    className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/30 data-[placeholder]:text-white/70 [&_svg]:text-white/70"
                    aria-label={t('selectAccount')}
                  >
                    <SelectValue placeholder={t('selectAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allAccounts')}</SelectItem>
                    {financeAccounts.map((account) => {
                      const symbol = CURRENCY_SYMBOLS[account.currency] ?? account.currency;
                      return (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.currency}) ·{' '}
                          {account.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          {symbol}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedAccount && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openAccountFormForEdit(selectedAccount.id)}
                      className="shrink-0 text-white hover:bg-white/20 hover:text-white"
                      aria-label={t('editAccount')}
                    >
                      <Pencil size={18} />
                    </Button>
                    <AccountDeleteButton
                      account={selectedAccount}
                      className="text-white hover:bg-white/20 hover:text-white"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SegmentedControl
        options={[
          { value: 'expense' as const, label: t('expenses') },
          { value: 'income' as const, label: t('incomes') },
        ]}
        value={financeViewType}
        onChange={setFinanceViewType}
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              options={[
                { value: 'day' as const, label: t('periods.day') },
                { value: 'week' as const, label: t('periods.week') },
                { value: 'month' as const, label: t('periods.month') },
                { value: 'year' as const, label: t('periods.year') },
              ]}
              value={financePeriod}
              onChange={setFinancePeriod}
              className="text-xs"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => shiftPeriod(-1)}
                className="rounded p-1 hover:bg-accent"
                aria-label={t('previousPeriod')}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-[8rem] text-center">{periodLabel}</span>
              <button
                type="button"
                onClick={() => shiftPeriod(1)}
                className="rounded p-1 hover:bg-accent"
                aria-label={t('nextPeriod')}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <FinanceDonutChart
            data={breakdown}
            total={periodTotal}
            currencySymbol={displaySymbol}
            className="my-6"
          />

          <DisplayCurrencySelector
            value={displayCurrency}
            onChange={setDisplayCurrency}
            rates={rates}
            className="mb-4 border-t pt-4"
          />

          {ratesError && (
            <p className="mb-3 text-sm text-destructive">{t('ratesError')}</p>
          )}
          {ratesLoading && !rates && (
            <p className="mb-3 text-sm text-muted-foreground">{t('ratesLoading')}</p>
          )}

          <CategoryBreakdownList items={breakdown} currency={displayCurrency} />
        </CardContent>
      </Card>

      {recentTransactions.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium">{t('recentTransactions')}</h2>
          <ul className="space-y-2">
            {recentTransactions.map((tx) => {
              const def = getCategoryDefinition(tx.category);
              const Icon = def.icon;
              const isExpense = tx.type === 'expense';
              const { amount, symbol } = getTransactionDisplayAmount(tx);
              const account = financeAccounts.find((a) => a.id === tx.accountId);

              return (
                <li
                  key={tx.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      def.bgColor
                    )}
                  >
                    <Icon size={20} style={{ color: def.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t(`categories.${tx.category}`)}</p>
                    {tx.description && (
                      <p className="truncate text-sm text-muted-foreground">{tx.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {tx.date}
                      {account ? ` · ${account.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <p
                      className={cn(
                        'font-medium tabular-nums',
                        isExpense ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {isExpense ? '−' : '+'}
                      {amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      {symbol}
                    </p>
                    <button
                      type="button"
                      onClick={() => openTransactionFormForEdit(tx.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label={t('editTransaction')}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFinanceTransaction(tx.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                      aria-label={t('deleteTransaction')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
