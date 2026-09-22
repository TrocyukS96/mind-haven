'use client';

import { GoalFormModal } from '@/features/goal';
import { HabitFormModal } from '@/features/habit';
import { JournalFormModal } from '@/features/journal';
import { AccountFormModal, TransactionFormModal } from '@/features/finance';
import { useStore } from '@/shared/store/store-config';
import { EnergyCheckInModal } from '@/features/energy/ui/energy-check-in-modal';
import { EnergyResultDialog } from '@/features/energy/ui/energy-result-dialog';
import { TaskFormModal } from '@/features/task';

export function ModalProvider() {
  const {
    isGoalFormOpen,
    closeGoalForm,
    isTaskFormOpen,
    closeTaskForm,
    isJournalFormOpen,
    closeJournalForm,
    isHabitFormOpen,
    closeHabitForm,
    isAccountFormOpen,
    closeAccountForm,
    isTransactionFormOpen,
    closeTransactionForm,
    isEnergyCheckInOpen,
    closeEnergyCheckIn,
  } = useStore();

  return (
    <>
      <GoalFormModal
        open={isGoalFormOpen}
        onOpenChange={(open) => !open && closeGoalForm()}
      />

      <TaskFormModal
        open={isTaskFormOpen}
        onOpenChange={(open) => !open && closeTaskForm()}
      />

      <JournalFormModal
        open={isJournalFormOpen}
        onOpenChange={(open) => !open && closeJournalForm()}
      />

      <HabitFormModal
        open={isHabitFormOpen}
        onOpenChange={(open) => !open && closeHabitForm()}
      />

      <AccountFormModal
        open={isAccountFormOpen}
        onOpenChange={(open) => !open && closeAccountForm()}
      />

      <TransactionFormModal
        open={isTransactionFormOpen}
        onOpenChange={(open) => !open && closeTransactionForm()}
      />

      <EnergyCheckInModal
        open={isEnergyCheckInOpen}
        onOpenChange={(open) => !open && closeEnergyCheckIn()}
      />

      <EnergyResultDialog />
    </>
  );
}