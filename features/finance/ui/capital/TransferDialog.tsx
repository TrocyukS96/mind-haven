'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CURRENCY_SYMBOLS } from '@/entities/finance/model/categories';
import { convertCurrency } from '@/entities/finance/lib/currency-converter';
import type { FinanceTransfer } from '@/entities/finance/model/types';
import { useExchangeRates } from '@/features/finance/hooks/use-exchange-rates';
import { financeErrorText } from '@/features/finance/lib/finance-error-text';
import { toLocalIsoDate } from '@/features/finance/lib/transaction-form-initial-values';
import { TransactionDateField } from '@/features/finance/ui/TransactionDateField';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

interface TransferDialogProps {
  open: boolean;
  transfer?: FinanceTransfer | null;
  onOpenChange: (open: boolean) => void;
}

export function TransferDialog({ open, transfer = null, onOpenChange }: TransferDialogProps) {
  const t = useTranslations('finance');
  const { rates } = useExchangeRates();
  const { financeAccounts, addFinanceTransfer, updateFinanceTransfer } = useStore();
  const accounts = financeAccounts.filter((account) => !account.archivedAt);
  const keyRef = useRef(transfer?.idempotencyKey ?? crypto.randomUUID());
  const [fromId, setFromId] = useState(transfer?.fromAccountId ?? accounts[0]?.id ?? '');
  const [toId, setToId] = useState(transfer?.toAccountId ?? accounts[1]?.id ?? '');
  const [debit, setDebit] = useState(transfer ? String(transfer.debitAmount) : '');
  const [credit, setCredit] = useState(transfer ? String(transfer.creditAmount) : '');
  const [rate, setRate] = useState(transfer?.exchangeRate ? String(transfer.exchangeRate) : '');
  const [fee, setFee] = useState(transfer?.feeAmount ? String(transfer.feeAmount) : '');
  const [date, setDate] = useState(transfer?.date ?? toLocalIsoDate());
  const [comment, setComment] = useState(transfer?.comment ?? '');
  const [creditTouched, setCreditTouched] = useState(Boolean(transfer));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    keyRef.current = transfer?.idempotencyKey ?? crypto.randomUUID();
    setFromId(transfer?.fromAccountId ?? accounts[0]?.id ?? '');
    setToId(transfer?.toAccountId ?? accounts.find((account) => account.id !== (transfer?.fromAccountId ?? accounts[0]?.id))?.id ?? '');
    setDebit(transfer ? String(transfer.debitAmount) : '');
    setCredit(transfer ? String(transfer.creditAmount) : '');
    setRate(transfer?.exchangeRate ? String(transfer.exchangeRate) : '');
    setFee(transfer?.feeAmount ? String(transfer.feeAmount) : '');
    setDate(transfer?.date ?? toLocalIsoDate());
    setComment(transfer?.comment ?? '');
    setCreditTouched(Boolean(transfer));
    // Accounts are read when the dialog opens. Including the array would reset the form on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transfer]);

  const from = accounts.find((account) => account.id === fromId) ?? null;
  const to = accounts.find((account) => account.id === toId) ?? null;
  const cross = Boolean(from && to && from.currency !== to.currency);
  const debitValue = Number(debit);
  const feeValue = fee ? Number(fee) : 0;

  useEffect(() => {
    if (!open || creditTouched || !cross || !from || !to || !rates || !Number.isFinite(debitValue) || debitValue <= 0) {
      return;
    }
    const suggested = convertCurrency(debitValue, from.currency, to.currency, rates);
    setCredit(suggested.toFixed(2));
    setRate((suggested / debitValue).toFixed(6));
  }, [open, creditTouched, cross, from, to, rates, debitValue]);

  const creditValue = cross ? Number(credit) : debitValue;
  const fromAfter = from ? from.balance - (Number.isFinite(debitValue) ? debitValue : 0) - (Number.isFinite(feeValue) ? feeValue : 0) : null;
  const toAfter = to ? to.balance + (Number.isFinite(creditValue) ? creditValue : 0) : null;

  const canSubmit = useMemo(() => {
    return Boolean(from && to && from.id !== to.id && debitValue > 0 && creditValue > 0 && date);
  }, [from, to, debitValue, creditValue, date]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!from || !to || !canSubmit) return;
    setLoading(true);
    const input = {
      fromAccountId: from.id,
      toAccountId: to.id,
      debitAmount: debitValue,
      creditAmount: creditValue,
      feeAmount: Number.isFinite(feeValue) ? feeValue : 0,
      date,
      comment,
      idempotencyKey: keyRef.current,
    };
    try {
      if (transfer) await updateFinanceTransfer(transfer.id, input);
      else await addFinanceTransfer(input);
      if (from.purpose !== 'CAPITAL' && to.purpose === 'CAPITAL') {
        toast.success(t('capital.depositSuccess', { amount: creditValue.toFixed(2), currency: to.currency }));
      } else {
        toast.success(t('capital.transferSaved'));
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
      <DialogContent className="max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>{transfer ? t('capital.editTransfer') : t('capital.transfer')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <AccountField label={t('capital.form.from')} value={fromId} accounts={accounts} onChange={setFromId} />
            <AccountField label={t('capital.form.to')} value={toId} accounts={accounts} onChange={setToId} />
          </div>
          <div className="space-y-2">
            <Label>{t('capital.form.debit')}</Label>
            <Input type="number" min="0.01" step="0.01" value={debit} onChange={(event) => setDebit(event.target.value)} required />
            {from && (
              <p className="text-xs text-muted-foreground">
                {t('capital.form.available')}: {from.balance.toFixed(2)} {CURRENCY_SYMBOLS[from.currency]}
                {fromAfter != null && ` · ${t('capital.form.after')}: ${fromAfter.toFixed(2)}`}
              </p>
            )}
          </div>
          {cross && (
            <>
              <div className="space-y-2">
                <Label>{t('capital.form.credit')}</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={credit}
                  onChange={(event) => {
                    setCreditTouched(true);
                    setCredit(event.target.value);
                    const next = Number(event.target.value);
                    if (debitValue > 0 && next > 0) setRate((next / debitValue).toFixed(6));
                  }}
                  required
                />
                {to && toAfter != null && (
                  <p className="text-xs text-muted-foreground">
                    {t('capital.form.after')}: {toAfter.toFixed(2)} {CURRENCY_SYMBOLS[to.currency]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('capital.form.rate')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={rate}
                  onChange={(event) => {
                    setCreditTouched(true);
                    setRate(event.target.value);
                    const next = Number(event.target.value);
                    if (debitValue > 0 && next > 0) setCredit((debitValue * next).toFixed(2));
                  }}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>{t('capital.form.fee')}</Label>
            <Input type="number" min="0" step="0.01" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>{t('date')}</Label>
            <TransactionDateField id="transfer-date" value={date} onChange={setDate} />
          </div>
          <div className="space-y-2">
            <Label>{t('description')}</Label>
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} />
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={!canSubmit}>
            {t('saveTransaction')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountField({
  label,
  value,
  accounts,
  onChange,
}: {
  label: string;
  value: string;
  accounts: Array<{ id: string; name: string; currency: string; purpose: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name} · {account.currency}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
