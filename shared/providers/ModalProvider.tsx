// components/modal-provider.tsx  ← отдельный клиентский компонент
'use client';

import { CreateGoalModal } from '@/features/goal/create-goal';
import { useStore } from '@/shared/store/store-config';

export function ModalProvider() {
  const { isGoalFormOpen, closeGoalForm } = useStore();

  return (
    <CreateGoalModal
      open={isGoalFormOpen}
      onOpenChange={(open) => !open && closeGoalForm()}
    />
  );
}