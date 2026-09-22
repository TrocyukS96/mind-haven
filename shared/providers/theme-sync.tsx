'use client';

import { applyTheme, getResolvedTheme } from '@/shared/lib/theme';
import { useLocale } from 'next-intl';
import { useLayoutEffect } from 'react';

export function ThemeSync() {
  const locale = useLocale();

  useLayoutEffect(() => {
    applyTheme(getResolvedTheme());
  }, [locale]);

  return null;
}
