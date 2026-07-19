'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useAccess } from '@/features/access';
import { cn } from '@/shared/lib/utils';
import {
  BookOpen,
  Brain,
  CheckSquare,
  Flame,
  Home,
  Shield,
  Table2,
  Target,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { FeatureKey } from '@/shared/config/features';
import { ThemeToggle } from './theme-toggle';

const menuItems: {
  id: string;
  labelKey: string;
  icon: typeof Home;
  href: '/' | '/goals' | '/tasks' | '/journal' | '/habits' | '/tables';
  feature: FeatureKey;
}[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: Home, href: '/', feature: 'dashboard' },
  { id: 'goals', labelKey: 'goals', icon: Target, href: '/goals', feature: 'goals' },
  { id: 'tasks', labelKey: 'tasks', icon: CheckSquare, href: '/tasks', feature: 'tasks' },
  { id: 'journal', labelKey: 'journal', icon: BookOpen, href: '/journal', feature: 'journal' },
  { id: 'habits', labelKey: 'habits', icon: Flame, href: '/habits', feature: 'habits' },
  { id: 'tables', labelKey: 'tables', icon: Table2, href: '/tables', feature: 'tables' },
];

interface SidebarProps {
  mobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
}

export function Sidebar({ mobileMenuOpen, onMobileMenuClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('sidebar');
  const tHeader = useTranslations('header');
  const { profile, getAccessibleFeatures, canAccessFeature } = useAccess();

  const visibleMenuItems = useMemo(
    () =>
      menuItems.filter((item) =>
        getAccessibleFeatures([item.feature]).includes(item.feature)
      ),
    [getAccessibleFeatures]
  );

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64',
          'border-r border-border bg-muted text-foreground dark:bg-[var(--sidebar)]',
          'transform transition-transform duration-200 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Brain size={22} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">Mind Haven</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('tagline')}</p>
              </div>
            </div>
            <nav className="space-y-2">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onMobileMenuClose}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-4 py-3',
                      'transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <Icon size={20} />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                );
              })}

              {profile.role !== 'GUEST' && canAccessFeature('profile') && (
                <Link
                  href="/profile"
                  onClick={onMobileMenuClose}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-4 py-3',
                    'transition-all duration-200',
                    pathname === '/profile'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  <User size={20} />
                  <span>{t('profile')}</span>
                </Link>
              )}

              {canAccessFeature('admin_panel') && (
                <Link
                  href="/admin"
                  onClick={onMobileMenuClose}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-4 py-3',
                    'transition-all duration-200',
                    pathname === '/admin'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  <Shield size={20} />
                  <span>{tHeader('adminPanel')}</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="shrink-0 border-t border-border bg-muted p-4 dark:bg-[var(--sidebar)]">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onMobileMenuClose}
        />
      )}
    </>
  );
}
