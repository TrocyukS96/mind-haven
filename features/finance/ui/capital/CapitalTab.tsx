'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import type { CapitalRange, FinanceTransfer, FinanceTransaction } from '@/entities/finance/model/types';
import { financeErrorText } from '@/features/finance/lib/finance-error-text';
import { useExchangeRates } from '@/features/finance/hooks/use-exchange-rates';
import { useHistoricalRates } from '@/features/finance/hooks/use-historical-rates';
import { DisplayCurrencySelector } from '@/features/finance/ui/DisplayCurrencySelector';
import { buildCapitalAnalytics, seriesStart } from '@/shared/lib/finance/capital-analytics';
import { isCapitalAccount } from '@/shared/lib/finance/capital-ledger';
import { goalProgress } from '@/shared/lib/finance/capital-goals';
import type { RateBook } from '@/shared/lib/finance/historical-rates';
import { useStore } from '@/shared/store/store-config';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { cn } from '@/shared/lib/utils';
import { toast } from 'react-toastify';
import { accountIcon } from './account-icons';
import { CapitalFlowChart, CapitalLineChart } from './CapitalCharts';
import { CapitalGoalDialog, CapitalMovementDialog, type MovementMode } from './CapitalDialogs';
import { formatMoney, toneClass, ValuedText } from './format';

function todayIso(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function CapitalTab({
  onOpenTransfer,
}: {
  onOpenTransfer: (transfer?: FinanceTransfer | null) => void;
}) {
  const t = useTranslations('finance');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;
  const {
    financeAccounts,
    financeTransactions,
    financeTransfers,
    financePurposeChanges,
    financeCapitalGoals,
    displayCurrency,
    setDisplayCurrency,
    openAccountForm,
    openAccountFormForEdit,
    archiveFinanceAccount,
    deleteFinanceTransfer,
    deleteFinanceTransaction,
    archiveCapitalGoal,
    deleteCapitalGoal,
    celebrateCapitalGoal,
  } = useStore();
  const { rates } = useExchangeRates();
  const today = todayIso();
  const [range, setRange] = useState<CapitalRange>('year');
  const books = useMemo(
    () => ({
      accounts: financeAccounts,
      transactions: financeTransactions,
      transfers: financeTransfers,
      purposeChanges: financePurposeChanges,
      goals: financeCapitalGoals,
    }),
    [financeAccounts, financeTransactions, financeTransfers, financePurposeChanges, financeCapitalGoals]
  );
  const from = seriesStart(range, today, null);
  const historyFrom = financePurposeChanges
    .filter((change) => change.toPurpose === 'CAPITAL')
    .map((change) => change.effectiveDate)
    .sort()[0] ?? from;
  const historical = useHistoricalRates(historyFrom, today);
  const rateBook: RateBook = useMemo(
    () => ({ series: historical.series, current: rates, today }),
    [historical.series, rates, today]
  );
  const analytics = useMemo(
    () => buildCapitalAnalytics(books, displayCurrency, rateBook, range),
    [books, displayCurrency, rateBook, range]
  );
  const capitalAccounts = financeAccounts.filter(isCapitalAccount);
  const [movement, setMovement] = useState<{ mode: MovementMode; transaction: FinanceTransaction | null } | null>(null);
  const [goalOpen, setGoalOpen] = useState<string | null | false>(false);
  const [focusedAccountId, setFocusedAccountId] = useState<string>('all');
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    kind: 'transfer' | 'transaction' | 'goal';
  } | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const celebrating = useRef(new Set<string>());

  useEffect(() => {
    const completed = financeCapitalGoals.find((goal) => {
      if (goal.archivedAt || goal.celebratedAt || celebrating.current.has(goal.id)) return false;
      const progress = goalProgress(goal, books, rateBook);
      return progress.percent != null && progress.percent >= 100;
    });
    if (!completed) return;
    celebrating.current.add(completed.id);
    setCelebration(completed.name);
    void celebrateCapitalGoal(completed.id);
  }, [books, financeCapitalGoals, rateBook, celebrateCapitalGoal]);

  const history = analytics.history.filter((row) => {
    if (focusedAccountId !== 'all' && row.accountId !== focusedAccountId && row.counterpartyAccountId !== focusedAccountId) {
      return false;
    }
    if (kind !== 'all' && row.kind !== kind) return false;
    if (query.trim()) {
      const accountName = financeAccounts.find((account) => account.id === row.accountId)?.name ?? '';
      const haystack = `${accountName} ${row.comment}`.toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  const activeGoals = financeCapitalGoals.filter((goal) => !goal.archivedAt);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-teal-800 to-emerald-950 text-white">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-white/75">{t('capital.title')}</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">
                {analytics.total.amount == null ? t('capital.noRateData') : formatMoney(analytics.total.amount, displayCurrency)}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <Metric label={t('capital.monthChange')} value={analytics.monthChange} currency={displayCurrency} />
                <Metric label={t('capital.monthNet')} value={analytics.monthNet} currency={displayCurrency} />
                <span>
                  {t('capital.monthPercent')}{' '}
                  <strong className={toneClass(analytics.monthChangePercent)}>
                    {analytics.monthChangePercent == null
                      ? t('capital.noComparisonBase')
                      : `${analytics.monthChangePercent.toFixed(1)}%`}
                  </strong>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setMovement({ mode: 'deposit', transaction: null })}>{t('capital.modes.deposit')}</Button>
              <Button variant="secondary" onClick={() => onOpenTransfer(null)}>{t('capital.transfer')}</Button>
              <Button variant="secondary" onClick={() => setMovement({ mode: 'withdrawal', transaction: null })}>{t('capital.modes.withdrawal')}</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" aria-label={t('capital.more')}><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(['interest', 'investment_income', 'revaluation', 'adjustment'] as const).map((mode) => (
                    <DropdownMenuItem key={mode} onClick={() => setMovement({ mode, transaction: null })}>
                      {t(`capital.modes.${mode}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <DisplayCurrencySelector value={displayCurrency} onChange={setDisplayCurrency} rates={rates} className="border-white/15 text-white" />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Info label={t('capital.metrics.deposited')} value={analytics.months.find((row) => row.isCurrent)?.contributed} currency={displayCurrency} />
        <Info label={t('capital.metrics.withdrawn')} value={analytics.months.find((row) => row.isCurrent)?.withdrawn} currency={displayCurrency} />
        <Info label={t('capital.metrics.net')} value={analytics.monthNet} currency={displayCurrency} />
        <Info label={t('capital.metrics.yield')} value={analytics.months.find((row) => row.isCurrent)?.yield} currency={displayCurrency} />
        <Info label={t('capital.metrics.average')} value={analytics.motivation.averageLast3} currency={displayCurrency} />
      </div>

      <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <p>{t('capital.motivation.streak', { count: analytics.motivation.positiveStreak })}</p>
        <p>
          {t('capital.motivation.best')}: {analytics.motivation.bestMonth ? `${analytics.motivation.bestMonth.month} · ${formatMoney(analytics.motivation.bestMonth.net, displayCurrency)}` : '—'}
        </p>
        <p>
          {t('capital.motivation.max')}: {analytics.motivation.maxCapital.amount == null ? '—' : formatMoney(analytics.motivation.maxCapital.amount, displayCurrency)}
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{t('capital.goalsTitle')}</h2>
          <Button variant="outline" size="sm" onClick={() => setGoalOpen(null)}><Plus size={16} />{t('capital.newGoal')}</Button>
        </div>
        {activeGoals.length === 0 ? (
          <EmptyState title={t('capital.goalsEmpty')} description={t('capital.goalsEmptyHint')} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {activeGoals.map((goal) => {
              const progress = goalProgress(goal, books, rateBook);
              return (
                <Card key={goal.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{goal.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t(`capital.goalTypes.${goal.goalType}`)} · {goal.startDate} — {goal.endDate}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={t('capital.more')}><MoreHorizontal size={16} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setGoalOpen(goal.id)}>{t('editAccount')}</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              void archiveCapitalGoal(goal.id).catch((error) =>
                                toast.error(financeErrorText(error, t))
                              );
                            }}
                          >
                            {t('capital.archive')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPendingDelete({ id: goal.id, kind: 'goal' })}>
                            {tCommon('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm">
                      {t('capital.goalTarget')}: {formatMoney(goal.targetAmount, goal.currency)}
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-emerald-500" style={{ width: `${progress.barPercent}%` }} />
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span>{progress.percent == null ? '—' : `${progress.percent.toFixed(0)}%`}</span>
                      <span>{t('capital.remaining')}: {progress.remaining == null ? '—' : formatMoney(progress.remaining, goal.currency)}</span>
                      <span>{t('capital.daysLeft', { count: progress.daysLeft })}</span>
                    </div>
                    {progress.recommendedMonthly != null && (
                      <p className="text-xs text-muted-foreground">
                        {t('capital.recommended', { amount: formatMoney(progress.recommendedMonthly, goal.currency) })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium">{t('capital.chartTitle')}</h2>
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={[
              { value: 'month', label: t('capital.ranges.month') },
              { value: '3m', label: t('capital.ranges.3m') },
              { value: '6m', label: t('capital.ranges.6m') },
              { value: 'year', label: t('capital.ranges.year') },
              { value: 'all', label: t('capital.ranges.all') },
            ]}
          />
        </div>
        {historical.error && (
          <Button variant="outline" size="sm" onClick={historical.retry}>{t('capital.retryRates')}</Button>
        )}
        <Card><CardContent className="p-4"><CapitalLineChart points={analytics.series} currency={displayCurrency} /></CardContent></Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">{t('capital.flowTitle')}</p>
            <CapitalFlowChart rows={analytics.months} currency={displayCurrency} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{t('capital.accountsTitle')}</h2>
          <Button variant="outline" size="sm" onClick={() => openAccountForm('CAPITAL')}><Plus size={16} />{t('capital.addAccount')}</Button>
        </div>
        {capitalAccounts.length === 0 ? (
          <EmptyState title={t('capital.emptyTitle')} description={t('capital.emptyDescription')}>
            <Button className="mt-2" onClick={() => openAccountForm('CAPITAL')}>{t('capital.addAccount')}</Button>
          </EmptyState>
        ) : (
          <div className="grid gap-2">
            {capitalAccounts.map((account) => {
              const Icon = accountIcon(account.icon);
              const delta = analytics.accountMonthChange[account.id];
              return (
                <div
                  key={account.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setFocusedAccountId(account.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setFocusedAccountId(account.id);
                  }}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{account.name}</span>
                    <span className={cn('text-sm', toneClass(delta?.amount))}>
                      {delta?.amount == null ? '—' : `${delta.amount > 0 ? '+' : ''}${formatMoney(delta.amount, displayCurrency)}`}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-medium tabular-nums">{formatMoney(account.balance, account.currency)}</span>
                    <span className="text-xs text-muted-foreground">{account.currency}</span>
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <span role="button" aria-label={t('capital.more')} className="rounded p-1" onClick={(event) => event.stopPropagation()}>
                        <MoreHorizontal size={16} />
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => openAccountFormForEdit(account.id)}>{t('editAccount')}</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          void archiveFinanceAccount(account.id).catch((error) =>
                            toast.error(financeErrorText(error, t))
                          );
                        }}
                      >
                        {t('capital.archive')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t('capital.tableTitle')}</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                {['month', 'opening', 'deposited', 'withdrawn', 'net', 'yield', 'fx', 'other', 'closing', 'change'].map((column) => (
                  <th key={column} className="px-3 py-2 font-medium">{t(`capital.columns.${column}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analytics.months.map((row) => (
                <Fragment key={row.month}>
                  <tr className="cursor-pointer border-t" onClick={() => setExpandedMonth(expandedMonth === row.month ? null : row.month)}>
                    <td className="px-3 py-2">
                      {format(new Date(`${row.month}-01T12:00:00`), 'LLLL yyyy', { locale: dateLocale })}
                      {row.isCurrent && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px]">{t('capital.currentMonth')}</span>}
                    </td>
                    <td className="px-3 py-2"><ValuedText value={row.opening} currency={displayCurrency} /></td>
                    <td className="px-3 py-2"><ValuedText value={row.contributed} currency={displayCurrency} /></td>
                    <td className="px-3 py-2"><ValuedText value={row.withdrawn} currency={displayCurrency} /></td>
                    <td className="px-3 py-2"><ValuedText value={row.netSavings} currency={displayCurrency} signed /></td>
                    <td className="px-3 py-2"><ValuedText value={row.yield} currency={displayCurrency} signed /></td>
                    <td className="px-3 py-2"><ValuedText value={row.revaluation} currency={displayCurrency} signed /></td>
                    <td className="px-3 py-2"><ValuedText value={row.other} currency={displayCurrency} signed /></td>
                    <td className="px-3 py-2"><ValuedText value={row.closing} currency={displayCurrency} /></td>
                    <td className={cn('px-3 py-2', toneClass(row.changePercent))}>
                      {row.changePercent == null ? t('capital.noComparisonBase') : `${row.changePercent.toFixed(1)}%`}
                    </td>
                  </tr>
                  {expandedMonth === row.month && (
                    <tr className="border-t bg-muted/20">
                      <td colSpan={10} className="px-3 py-2 text-xs text-muted-foreground">
                        {analytics.history.filter((item) => item.date.startsWith(row.month)).map((item) => (
                          <span key={item.id} className="mr-3 inline-block">{item.date}: {t(`capital.kinds.${item.kind}`)}</span>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t('capital.historyTitle')}</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('capital.search')} />
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={focusedAccountId} onChange={(event) => setFocusedAccountId(event.target.value)}>
            <option value="all">{t('allAccounts')}</option>
            {capitalAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="all">{t('capital.allKinds')}</option>
            {['deposit', 'withdrawal', 'purchase', 'contribution_transfer', 'withdrawal_transfer', 'internal_transfer', 'interest', 'investment_income', 'revaluation', 'adjustment', 'composition'].map((item) => (
              <option key={item} value={item}>{t(`capital.kinds.${item}`)}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t('date')}</th>
                <th className="px-3 py-2">{t('capital.columns.kind')}</th>
                <th className="px-3 py-2">{t('account')}</th>
                <th className="px-3 py-2">{t('amount')}</th>
                <th className="px-3 py-2">{t('capital.columns.display')}</th>
                <th className="px-3 py-2">{t('description')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {history.map((row) => {
                const account = financeAccounts.find((item) => item.id === row.accountId);
                const counterparty = financeAccounts.find((item) => item.id === row.counterpartyAccountId);
                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{t(`capital.kinds.${row.kind}`)}</td>
                    <td className="px-3 py-2">{counterparty ? `${account?.name ?? ''} → ${counterparty.name}` : account?.name}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatMoney(Math.abs(row.amount), row.currency)}
                      {row.counterAmount != null && row.counterCurrency ? ` → ${formatMoney(row.counterAmount, row.counterCurrency)}` : ''}
                      {row.feeAmount ? ` · ${t('capital.form.fee')} ${row.feeAmount.toFixed(2)}` : ''}
                    </td>
                    <td className="px-3 py-2"><ValuedText value={row.displayAmount} currency={displayCurrency} signed /></td>
                    <td className="px-3 py-2 text-muted-foreground">{row.comment}</td>
                    <td className="px-3 py-2">
                      {row.kind !== 'composition' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={t('capital.more')}><MoreHorizontal size={16} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => {
                                if (row.transferId) {
                                  onOpenTransfer(financeTransfers.find((item) => item.id === row.transferId) ?? null);
                                  return;
                                }
                                const transaction = financeTransactions.find((item) => item.id === row.transactionId);
                                if (!transaction?.capitalKind || transaction.capitalKind === 'transfer' || transaction.capitalKind === 'fee') return;
                                setMovement({ mode: transaction.capitalKind, transaction });
                              }}
                            >
                              {t('editTransaction')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setPendingDelete(
                                  row.transferId
                                    ? { id: row.transferId, kind: 'transfer' }
                                    : { id: row.transactionId ?? row.id, kind: 'transaction' }
                                )
                              }
                            >
                              {t('deleteTransaction')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {movement && (
        <CapitalMovementDialog
          open
          mode={movement.mode}
          movement={movement.transaction}
          onOpenChange={(open) => !open && setMovement(null)}
          onTransfer={() => {
            setMovement(null);
            onOpenTransfer(null);
          }}
        />
      )}
      <CapitalGoalDialog
        open={goalOpen !== false}
        goal={typeof goalOpen === 'string' ? financeCapitalGoals.find((goal) => goal.id === goalOpen) ?? null : null}
        onOpenChange={(open) => !open && setGoalOpen(false)}
      />
      <AlertDialog open={Boolean(celebration)} onOpenChange={(open) => !open && setCelebration(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('capital.celebrationTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('capital.celebration', { name: celebration ?? '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setCelebration(null)}>{t('capital.celebrationClose')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('capital.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('capital.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDelete) return;
                const request =
                  pendingDelete.kind === 'transfer'
                    ? deleteFinanceTransfer(pendingDelete.id)
                    : pendingDelete.kind === 'goal'
                      ? deleteCapitalGoal(pendingDelete.id)
                      : deleteFinanceTransaction(pendingDelete.id);
                void request.catch((error) => toast.error(financeErrorText(error, t)));
                setPendingDelete(null);
              }}
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Metric({
  label,
  value,
  currency,
}: {
  label: string;
  value: { amount: number | null };
  currency: Parameters<typeof formatMoney>[1];
}) {
  return (
    <span>
      {label}{' '}
      <strong className={toneClass(value.amount)}>
        {value.amount == null ? '—' : `${value.amount > 0 ? '+' : ''}${formatMoney(value.amount, currency)}`}
      </strong>
    </span>
  );
}

function Info({
  label,
  value,
  currency,
}: {
  label: string;
  value?: { amount: number | null; approximate: boolean; rateDate: string | null };
  currency: Parameters<typeof formatMoney>[1];
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 font-medium">{value ? <ValuedText value={value} currency={currency} signed /> : '—'}</p>
      </CardContent>
    </Card>
  );
}
