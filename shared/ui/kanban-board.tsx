'use client';

import type { ReactNode } from 'react';
import type { ItemTypeSection } from '@/shared/config/item-types';
import { useItemTypes } from '@/features/item-types';
import { useTranslations } from 'next-intl';

interface KanbanBoardProps<T> {
  section: ItemTypeSection;
  items: T[];
  getItemType: (item: T) => string | undefined;
  renderItem: (item: T) => ReactNode;
  emptyMessage: string;
}

export function KanbanBoard<T>({
  section,
  items,
  getItemType,
  renderItem,
  emptyMessage,
}: KanbanBoardProps<T>) {
  const { getEnabledTypes, resolveType } = useItemTypes();
  const t = useTranslations(section);

  const columns = getEnabledTypes(section);

  const getColumnLabel = (key: string, customLabel: string) => {
    if (customLabel) {
      return customLabel;
    }

    if (key === 'short' || key === 'medium' || key === 'long' || key === 'backlog') {
      return t(`types.${key}` as 'types.short');
    }

    return key;
  };

  if (items.length === 0) {
    return <p className="text-center text-muted-foreground py-12">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid gap-4 min-w-max md:min-w-0"
        style={{
          gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(240px, 1fr))`,
        }}
      >
      {columns.map((column) => {
        const columnItems = items.filter(
          (item) => resolveType(section, getItemType(item)) === column.key
        );

        return (
          <div key={column.key} className="rounded-xl border bg-card/50 p-4 space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold truncate">
                {getColumnLabel(column.key, column.label)}
              </h3>
              <span className="text-xs text-muted-foreground shrink-0">
                {columnItems.length}
              </span>
            </div>
            <div className="space-y-2 min-h-24">
              {columnItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {t('kanbanEmptyColumn')}
                </p>
              ) : (
                columnItems.map((item) => renderItem(item))
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
