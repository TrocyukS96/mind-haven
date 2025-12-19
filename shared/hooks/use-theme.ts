'use client';
import { useEffect, useRef } from "react";
import { useAppStore } from "../store/slices/app-slice";

export const useTheme = () => {
    const { theme, setTheme } = useAppStore();
    const isInitialized = useRef(false);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

  useEffect(() => {
    if (isInitialized.current) return;

    const html = document.documentElement;
    const domTheme =
      html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

    setTheme(domTheme);
    isInitialized.current = true;
  }, [setTheme]);

  useEffect(() => {
    if (!isInitialized.current) return;

    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return { theme, toggleTheme };
};