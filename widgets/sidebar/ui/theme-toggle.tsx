'use client';

import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('sidebar');
  const setTheme = useStore((state) => state.setTheme);
  const [theme, setLocalTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const resolved = getInitialTheme();
    setLocalTheme(resolved);
    setTheme(resolved);
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
