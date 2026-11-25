'use client';

import { useEffect, useRef, useState } from 'react';
import { FINANCE_CURRENCIES, getCategoriesByType } from '@/entities/finance/model/categories';
import type {
  CapitalDepositSource,
  FinanceCapitalGoal,
  FinanceCategoryKey,
  FinanceCurrency,
  FinanceTransaction,
  GoalPeriodPreset,
} from '@/entities/finance/model/types';
import { financeErrorText } from '@/features/finance/lib/finance-error-text';
import { suggestGoalDates } from '@/shared/lib/finance/capital-goals';
import type { CapitalMovementInput, GoalInput } from '@/shared/lib/finance/capital-ledger';
import { toLocalIsoDate } from '@/features/finance/lib/transaction-form-initial-values';
import { TransactionDateField } from '@/features/finance/ui/TransactionDateField';
import { isCapitalAccount } from '@/shared/lib/finance/capital-ledger';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

export type MovementMode =
  | 'deposit'
  | 'withdrawal'
  | 'interest'
  | 'investment_income'
  | 'revaluation'
  | 'adjustment';

export function CapitalMovementDialog({
  open,
  mode,
  movement,
  onOpenChange,
  onTransfer,
}: {
  open: boolean;
  mode: MovementMode;
  movement?: FinanceTransaction | null;
  onOpenChange: (open: boolean) => void;
  onTransfer?: () => void;
}) {
  const t = useTranslations('finance');
  const { financeAccounts, addCapitalMovement, updateCapitalMovement } = useStore();
  const accounts = financeAccounts.filter(isCapitalAccount);
  const keyRef = useRef(movement?.idempotencyKey ?? crypto.randomUUID());
  const [accountId, setAccountId] = useState(movement?.accountId ?? accounts[0]?.id ?? '');
  const [amount, setAmount] = useState(movement ? String(movement.amount) : '');
  const [date, setDate] = useState(movement?.date ?? toLocalIsoDate());
  const [comment, setComment] = useState(movement?.description ?? '');
  const [source, setSource] = useState<CapitalDepositSource>(movement?.source ?? 'cash');
  const [direction, setDirection] = useState<'in' | 'out'>(movement?.type === 'capital_out' ? 'out' : 'in');
  const [expenseCategory, setExpenseCategory] = useState<string>(movement?.expenseCategory ?? 'none');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    keyRef.current = movement?.idempotencyKey ?? crypto.randomUUID();
    setAccountId(movement?.accountId ?? accounts[0]?.id ?? '');
    setAmount(movement ? String(movement.amount) : '');
    setDate(movement?.date ?? toLocalIsoDate());
    setComment(movement?.description ?? '');
    setSource(movement?.source ?? 'cash');
    setDirection(movement?.type === 'capital_out' ? 'out' : 'in');
    setExpenseCategory(movement?.expenseCategory ?? 'none');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, movement, mode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(amount);
    if (!accountId || !Number.isFinite(parsed) || parsed <= 0) return;
    const input: CapitalMovementInput = {
      accountId,
      kind: mode,
      amount: parsed,
      date,
      comment,
      idempotencyKey: keyRef.current,
      direction: mode === 'revaluation' || mode === 'adjustment' ? direction : undefined,
      source: mode === 'deposit' ? source : null,
      expenseCategory:
        mode === 'withdrawal' && expenseCategory !== 'none'
          ? (expenseCategory as FinanceCategoryKey)
          : null,
    };
    setLoading(true);
    try {
      if (movement) await updateCapitalMovement(movement.id, input);
      else await addCapitalMovement(input);
      if (mode === 'deposit') {
        const currency = accounts.find((account) => account.id === accountId)?.currency ?? '';
        toast.success(t('capital.depositSuccess', { amount: parsed.toFixed(2), currency }));
      } else {
        toast.success(t('capital.movementSaved'));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(financeErrorText(error, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>{t(`capital.modes.${mode}`)}</DialogTitle>
          {mode === 'deposit' && <DialogDescription>{t('capital.depositHint')}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 overflow-y-auto px-6 py-5">
          {mode === 'withdrawal' && onTransfer && (
            <Button type="button" variant="outline" className="w-full" onClick={onTransfer}>
              {t('capital.withdrawToAccount')}
            </Button>
          )}
          <div className="space-y-2">
            <Label>{t('account')}</Label>
            <Select value={accountId || undefined} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder={t('selectAccount')} /></SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('amount')}</Label>
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </div>
          {(mode === 'revaluation' || mode === 'adjustment') && (
            <div className="space-y-2">
              <Label>{t('capital.form.direction')}</Label>
              <Select value={direction} onValueChange={(value) => setDirection(value as 'in' | 'out')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">{t('capital.form.increase')}</SelectItem>
                  <SelectItem value="out">{t('capital.form.decrease')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === 'deposit' && (
            <div className="space-y-2">
              <Label>{t('capital.form.source')}</Label>
              <Select value={source} onValueChange={(value) => setSource(value as CapitalDepositSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['cash', 'external', 'gift', 'other'] as const).map((item) => (
                    <SelectItem key={item} value={item}>{t(`capital.sources.${item}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === 'withdrawal' && (
            <div className="space-y-2">
              <Label>{t('capital.form.expenseOptional')}</Label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('capital.form.noExpense')}</SelectItem>
                  {getCategoriesByType('expense').map((category) => (
                    <SelectItem key={category.key} value={category.key}>{t(`categories.${category.key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('date')}</Label>
            <TransactionDateField id="capital-movement-date" value={date} onChange={setDate} />
          </div>
          <div className="space-y-2">
            <Label>{t('description')}</Label>
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} />
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={accounts.length === 0}>
            {t('saveTransaction')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CapitalGoalDialog({
  open,
  goal,
  onOpenChange,
}: {
  open: boolean;
  goal?: FinanceCapitalGoal | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('finance');
  const { addCapitalGoal, updateCapitalGoal } = useStore();
  const [name, setName] = useState(goal?.name ?? '');
  const [goalType, setGoalType] = useState<FinanceCapitalGoal['goalType']>(goal?.goalType ?? 'period_savings');
  const [amount, setAmount] = useState(goal ? String(goal.targetAmount) : '');
  const [currency, setCurrency] = useState<FinanceCurrency>(goal?.currency ?? 'USD');
  const [preset, setPreset] = useState<GoalPeriodPreset>('custom');
  const [startDate, setStartDate] = useState(goal?.startDate ?? toLocalIsoDate());
  const [endDate, setEndDate] = useState(goal?.endDate ?? toLocalIsoDate());
  const [description, setDescription] = useState(goal?.description ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? '');
    setGoalType(goal?.goalType ?? 'period_savings');
    setAmount(goal ? String(goal.targetAmount) : '');
    setCurrency(goal?.currency ?? 'USD');
    setStartDate(goal?.startDate ?? toLocalIsoDate());
    setEndDate(goal?.endDate ?? toLocalIsoDate());
    setDescription(goal?.description ?? '');
    setPreset('custom');
  }, [open, goal]);

  const applyPreset = (next: GoalPeriodPreset) => {
    setPreset(next);
    const dates = suggestGoalDates(next, startDate || toLocalIsoDate());
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const input: GoalInput = {
      name,
      goalType,
      targetAmount: Number(amount),
      currency,
      startDate,
      endDate,
      description,
    };
    setLoading(true);
    try {
      if (goal) await updateCapitalGoal(goal.id, input);
      else await addCapitalGoal(input);
      toast.success(t('capital.goalSaved'));
      onOpenChange(false);
    } catch (error) {
      toast.error(financeErrorText(error, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>{goal ? t('capital.editGoal') : t('capital.newGoal')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label>{t('capital.goalName')}</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>{t('capital.goalType')}</Label>
            <Select value={goalType} onValueChange={(value) => setGoalType(value as FinanceCapitalGoal['goalType'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="period_savings">{t('capital.goalTypes.period_savings')}</SelectItem>
                <SelectItem value="capital_target">{t('capital.goalTypes.capital_target')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('amount')}</Label>
              <Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('currency')}</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as FinanceCurrency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FINANCE_CURRENCIES.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('capital.periodPreset')}</Label>
            <Select value={preset} onValueChange={(value) => applyPreset(value as GoalPeriodPreset)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['month', 'quarter', 'half', 'year', 'five_years', 'custom'] as const).map((item) => (
                  <SelectItem key={item} value={item}>{t(`capital.presets.${item}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('capital.startDate')}</Label>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('capital.endDate')}</Label>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('description')}</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
          </div>
          <Button type="submit" className="w-full" loading={loading}>{t('saveAccount')}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
