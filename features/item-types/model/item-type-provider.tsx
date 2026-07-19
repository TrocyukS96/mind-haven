'use client';

import type {
  ItemTypeCatalog,
  ItemTypeDefinition,
  ItemTypeSection,
} from '@/shared/config/item-types';
import {
  getDefaultItemTypeKey,
  getEnabledItemTypes,
  resolveItemType,
} from '@/shared/config/item-types';
import { createContext, useContext, useMemo } from 'react';

interface ItemTypeProviderProps {
  catalog: ItemTypeCatalog;
  children: React.ReactNode;
}

interface ItemTypeContextValue {
  catalog: ItemTypeCatalog;
  getTypes: (section: ItemTypeSection) => ItemTypeDefinition[];
  getEnabledTypes: (section: ItemTypeSection) => ItemTypeDefinition[];
  getDefaultTypeKey: (section: ItemTypeSection) => string;
  resolveType: (section: ItemTypeSection, value?: string) => string;
  getTypeLabel: (section: ItemTypeSection, key: string) => string;
}

const ItemTypeContext = createContext<ItemTypeContextValue | null>(null);

export function ItemTypeProvider({ catalog, children }: ItemTypeProviderProps) {
  const value = useMemo<ItemTypeContextValue>(
    () => ({
      catalog,
      getTypes: (section) => catalog[section],
      getEnabledTypes: (section) => getEnabledItemTypes(catalog, section),
      getDefaultTypeKey: (section) => getDefaultItemTypeKey(section),
      resolveType: (section, typeValue) => resolveItemType(typeValue, section, catalog),
      getTypeLabel: (section, key) => {
        const type = catalog[section].find((item) => item.key === key);
        if (!type) {
          return key;
        }
        return type.label || key;
      },
    }),
    [catalog]
  );

  return <ItemTypeContext.Provider value={value}>{children}</ItemTypeContext.Provider>;
}

export function useItemTypes(): ItemTypeContextValue {
  const context = useContext(ItemTypeContext);

  if (!context) {
    throw new Error('useItemTypes must be used within ItemTypeProvider');
  }

  return context;
}

export function useItemTypeLabel(section: ItemTypeSection, key: string): string {
  const { getTypeLabel, catalog } = useItemTypes();
  const type = catalog[section].find((item) => item.key === key);

  if (type?.label) {
    return type.label;
  }

  return getTypeLabel(section, key);
}
