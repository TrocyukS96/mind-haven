'use client';

import { CURRENCY_SYMBOLS } from '@/entities/finance/model/categories';
import { AccountDeleteButton } from '@/features/finance/ui/AccountDeleteButton';
import { useStore } from '@/shared/store/store-config';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface AccountSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSettingsModal({ open, onOpenChange }: AccountSettingsModalProps) {
  const t = useTranslations('finance');
  const {
    financeAccounts,
    setDefaultFinanceAccount,
    openAccountForm,
    openAccountFormForEdit,
  } = useStore();
  const [saving, setSaving] = useState(false);

  const defaultAccountId = financeAccounts.find((account) => account.isDefault)?.id ?? 'all';

  const handleDefaultChange = async (value: string) => {
    const nextId = value === 'all' ? null : value;
    setSaving(true);

    try {
      await setDefaultFinanceAccount(nextId);
      toast.success(t('defaultAccountUpdated'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">{t('accountSettingsTitle')}</DialogTitle>
          <DialogDescription>{t('accountSettingsDescription')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(100vh-10rem)] space-y-6 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label>{t('defaultAccount')}</Label>
            <Select
              value={defaultAccountId}
              onValueChange={handleDefaultChange}
              disabled={saving || financeAccounts.length === 0}
            >
              <SelectTrigger aria-label={t('defaultAccount')}>
                <SelectValue placeholder={t('selectAccount')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allAccounts')}</SelectItem>
                {financeAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('defaultAccountHint')}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{t('accountsSection')}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openAccountForm()}
              >
                {t('newAccount')}
              </Button>
            </div>

            <ul className="space-y-2">
              {financeAccounts.map((account) => {
                const symbol = CURRENCY_SYMBOLS[account.currency] ?? account.currency;

                return (
                  <li
                    key={account.id}
                    className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{account.name}</p>
                        {account.isDefault && (
                          <Badge variant="secondary">{t('defaultBadge')}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {account.currency} ·{' '}
                        {account.balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {symbol}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openAccountFormForEdit(account.id)}
                      aria-label={t('editAccount')}
                    >
                      <Pencil size={18} />
                    </Button>
                    <AccountDeleteButton account={account} />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
