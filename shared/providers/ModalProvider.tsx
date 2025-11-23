// components/modal-provider.tsx  ← отдельный клиентский компонент
'use client';

import { CreateGoalModal } from '@/features/goal/create-goal';
import { useStore } from '@/shared/store/store-config';

export function ModalProvider() {
  const { isCreateGoalModalOpen, setIsCreateGoalModalOpen } = useStore();

  return (
    <CreateGoalModal
      open={isCreateGoalModalOpen}
      onOpenChange={setIsCreateGoalModalOpen}
    />
  );
}