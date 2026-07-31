'use client';

import type { FinanceAccount } from '@/entities/finance/model/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { useStore } from '@/shared/store/store-config';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface Props {
  account: FinanceAccount;
  className?: string;
  onDeleted?: () => void;
}

export function AccountDeleteButton({ account, className, onDeleted }: Props) {
  const { deleteFinanceAccount } = useStore();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('finance');
  const tCommon = useTranslations('common');

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteFinanceAccount(account.id);
      toast.success(t('accountDeleted'));
      onDeleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('saveError'));
    } finally {
      setLoading(false);
      setIsDeleteOpen(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('shrink-0', className)}
        aria-label={t('deleteAccount')}
        onClick={() => setIsDeleteOpen(true)}
      >
        <Trash2 size={18} />
      </Button>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t('deleteAccountTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              {t('deleteAccountDescription', { name: account.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
