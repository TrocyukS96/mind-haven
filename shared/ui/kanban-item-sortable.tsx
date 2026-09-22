'use client';

import { GripVertical } from 'lucide-react';
import {
  createContext,
  useContext,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';

export interface KanbanItemSortableValue {
  attributes: HTMLAttributes<HTMLElement>;
  listeners?: HTMLAttributes<HTMLElement>;
  isDragging: boolean;
}

const KanbanItemSortableContext = createContext<KanbanItemSortableValue | null>(null);

export function KanbanItemSortableProvider({
  value,
  children,
}: {
  value: KanbanItemSortableValue;
  children: ReactNode;
}) {
  return (
    <KanbanItemSortableContext.Provider value={value}>
      {children}
    </KanbanItemSortableContext.Provider>
  );
}

export function useKanbanItemSortable() {
  return useContext(KanbanItemSortableContext);
}

export function KanbanItemDragHandle({ className }: { className?: string }) {
  const sortable = useKanbanItemSortable();
  const t = useTranslations('common');

  if (!sortable) {
    return null;
  }

  return (
    <button
      type="button"
      className={cn(
        'flex h-6 w-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground/70 transition-colors hover:text-foreground active:cursor-grabbing',
        className
      )}
      aria-label={t('reorderItem')}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );
}
