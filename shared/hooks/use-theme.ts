'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/slices/app-slice';

const getStoredTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeToDocument = (theme: 'light' | 'dark') => {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

export const useTheme = () => {
  const { theme, setTheme } = useAppStore();
  const isInitialized = useRef(false);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      const storedTheme = getStoredTheme();
      setTheme(storedTheme);
      applyThemeToDocument(storedTheme);
      return;
    }

    localStorage.setItem('theme', theme);
    applyThemeToDocument(theme);
  }, [theme, setTheme]);

  return { theme, toggleTheme };
};
