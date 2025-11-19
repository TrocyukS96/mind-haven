'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Target, CheckSquare, Table, Menu, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const menuItems = [
  { id: 'dashboard', label: 'Главная', icon: Home, href: '/' },
  { id: 'journal', label: 'Журнал', icon: BookOpen, href: '/journal' },
  { id: 'goals', label: 'Цели', icon: Target, href: '/goals' },
  { id: 'habits', label: 'Привычки', icon: CheckSquare, href: '/habits' },
  { id: 'tables', label: 'Таблицы', icon: Table, href: '/tables' },
];

export function Sidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40",
          "w-64 bg-card border-r border-border",
          "transform transition-transform duration-200 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6">
          <h2 className="mb-8">Саморазвитие</h2>
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
      </aside>

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
