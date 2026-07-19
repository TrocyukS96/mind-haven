'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { JournalForm } from './JournalForm';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JournalFormModal({ open, onOpenChange }: Props) {
  const { selectedJournalEntry, isJournalFormOpen, closeJournalForm } = useStore();
  const t = useTranslations('journal');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedJournalEntry ? t('editEntry') : t('newEntry')}
            </DialogTitle>
          </DialogHeader>

          <JournalForm
            entry={selectedJournalEntry}
            open={isJournalFormOpen}
            onOpenChange={(isOpen) => !isOpen && closeJournalForm()}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
