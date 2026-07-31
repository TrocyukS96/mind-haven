'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { TransactionForm } from './TransactionForm';
import { getTransactionFormKey } from '@/features/finance/lib/transaction-form-initial-values';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionFormModal({ open, onOpenChange }: Props) {
  const {
    closeTransactionForm,
    transactionFormType,
    editingTransactionId,
    transactionFormDraft,
    financeTransactions,
  } = useStore();
  const t = useTranslations('finance');

  const editingTransaction =
    editingTransactionId != null
      ? (financeTransactions.find((tx) => tx.id === editingTransactionId) ?? null)
      : null;

  const title = editingTransaction
    ? editingTransaction.type === 'expense'
      ? t('editExpense')
      : t('editIncome')
    : transactionFormType === 'expense'
      ? t('newExpense')
      : t('newIncome');

  const formKey = getTransactionFormKey(transactionFormDraft, editingTransactionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-5">
          <TransactionForm
            key={formKey}
            type={editingTransaction?.type ?? transactionFormDraft?.type ?? transactionFormType}
            transaction={editingTransaction}
            onSuccess={() => closeTransactionForm()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
