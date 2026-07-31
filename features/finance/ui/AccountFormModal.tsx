'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { AccountForm } from './AccountForm';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountFormModal({ open, onOpenChange }: Props) {
  const { closeAccountForm, editingAccountId, financeAccounts } = useStore();
  const t = useTranslations('finance');

  const editingAccount =
    editingAccountId != null
      ? (financeAccounts.find((account) => account.id === editingAccountId) ?? null)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">
            {editingAccount ? t('editAccount') : t('newAccount')}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5">
          <AccountForm
            key={editingAccount?.id ?? 'new'}
            account={editingAccount}
            onSuccess={() => closeAccountForm()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
