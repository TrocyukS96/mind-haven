'use client';

import type { ItemTypeSection } from '@/shared/config/item-types';
import { useItemTypes } from '@/features/item-types';
import { Badge } from '@/shared/ui/badge';
import { useTranslations } from 'next-intl';

const SYSTEM_TYPE_KEYS = ['short', 'medium', 'long', 'backlog'] as const;

interface ItemTypeBadgeProps {
  section: ItemTypeSection;
  typeKey: string;
  className?: string;
}

export function ItemTypeBadge({ section, typeKey, className }: ItemTypeBadgeProps) {
  const { catalog, resolveType } = useItemTypes();
  const t = useTranslations(section);
  const resolvedType = resolveType(section, typeKey);
  const typeDef = catalog[section].find((item) => item.key === resolvedType);

  const label =
    typeDef?.label ||
    (SYSTEM_TYPE_KEYS.includes(resolvedType as (typeof SYSTEM_TYPE_KEYS)[number])
      ? t(`types.${resolvedType}` as 'types.short')
      : resolvedType);

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
