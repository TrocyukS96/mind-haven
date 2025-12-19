'use client';

import { useTheme } from '@/shared/hooks/use-theme';
import { cn } from '@/shared/lib/utils';
import {
  BookOpen,
  CheckSquare,
  Home,
  Menu,
  Moon,
  Sun,
  Table,
  Target,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const menuItems = [
  { id: 'dashboard', label: 'Главная', icon: Home, href: '/' },
  { id: 'goals', label: 'Цели', icon: Target, href: '/goals' },
  { id: 'tasks', label: 'Задачи', icon: CheckSquare, href: '/tasks' },
  { id: 'journal', label: 'Журнал', icon: BookOpen, href: '/journal' },
  { id: 'habits', label: 'Привычки', icon: CheckSquare, href: '/habits' },
  { id: 'tables', label: 'Таблицы', icon: Table, href: '/tables' },
];

export function Sidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  
  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40",
          "w-64 bg-[#f3f4f6] dark:bg-[var(--sidebar)] border-r border-border text-foreground",
          "transform transition-transform duration-200 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-full flex flex-col pb-24">
          <div className="flex-1 p-6 overflow-y-auto">
            <h2 className="mb-8 text-lg font-semibold">Саморазвитие</h2>
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg",
                      "transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>

      {/* Fixed Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          "fixed left-0 z-40 cursor-pointer",
          "w-64 bg-[#f3f4f6] dark:bg-[var(--sidebar)]",
          "border-t border-r border-border",
          "flex items-center justify-between px-6 py-4",
          "text-sm font-medium text-foreground transition-colors",
          "hover:bg-accent",
          "transform transition-transform duration-200 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "bottom-0"
        )}
      >
        <span>{theme === 'dark' ? 'Темная тема' : 'Светлая тема'}</span>
        {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}