'use client';

import { applyTheme, getResolvedTheme, type Theme } from '@/shared/lib/theme';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useState } from 'react';

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('sidebar');
  const setTheme = useStore((state) => state.setTheme);
  const [theme, setLocalTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const resolved = getResolvedTheme();
    setLocalTheme(resolved);
    setTheme(resolved);
    applyTheme(resolved);
    setMounted(true);
  }, [setTheme]);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setLocalTheme(next);
    setTheme(next);
    applyTheme(next);
  };

  if (!mounted) {
    return (
      <div className={cn('h-12 rounded-lg bg-accent/40 animate-pulse', className)} aria-hidden />
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggleTheme}
      className={cn(
        'w-full justify-start gap-3 rounded-lg px-4 py-3 h-auto',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
        className
      )}
      aria-label={isDark ? t('lightTheme') : t('darkTheme')}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
      <span>{isDark ? t('lightTheme') : t('darkTheme')}</span>
    </Button>
  );
}
