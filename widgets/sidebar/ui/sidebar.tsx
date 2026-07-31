'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useAccess } from '@/features/access';
import { SignInButton, SignOutButton } from '@/features/auth';
import { LocaleSwitcher } from '@/widgets/header/ui/locale-switcher';
import { cn } from '@/shared/lib/utils';
import {
  BookOpen,
  Brain,
  CheckSquare,
  Flame,
  Gift,
  Home,
  Shield,
  Target,
  User,
  X,
  PanelLeftClose,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { UI_HIDDEN_FEATURES, type FeatureKey } from '@/shared/config/features';
import { ThemeToggle } from './theme-toggle';

const menuItems: {
  id: string;
  labelKey: string;
  icon: typeof Home;
  href: '/' | '/goals' | '/tasks' | '/journal' | '/habits' | '/rewards';
  feature: FeatureKey;
}[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: Home, href: '/', feature: 'dashboard' },
  { id: 'goals', labelKey: 'goals', icon: Target, href: '/goals', feature: 'goals' },
  { id: 'tasks', labelKey: 'tasks', icon: CheckSquare, href: '/tasks', feature: 'tasks' },
  { id: 'journal', labelKey: 'journal', icon: BookOpen, href: '/journal', feature: 'journal' },
  { id: 'habits', labelKey: 'habits', icon: Flame, href: '/habits', feature: 'habits' },
  { id: 'rewards', labelKey: 'rewards', icon: Gift, href: '/rewards', feature: 'gamification' },
];

interface SidebarProps {
  mobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
  desktopCollapsed?: boolean;
  onDesktopCollapse?: () => void;
}

export function Sidebar({
  mobileMenuOpen,
  onMobileMenuClose,
  desktopCollapsed = false,
  onDesktopCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('sidebar');
  const tHeader = useTranslations('header');
  const { profile, getAccessibleFeatures, canAccessFeature } = useAccess();
  const isGuest = profile.role === 'GUEST';

  const visibleMenuItems = useMemo(
    () =>
      menuItems.filter(
        (item) =>
          !UI_HIDDEN_FEATURES.has(item.feature) &&
          getAccessibleFeatures([item.feature]).includes(item.feature)
      ),
    [getAccessibleFeatures]
  );

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[min(100vw-1.5rem,18rem)] flex-col',
          'border-r border-border bg-muted text-foreground dark:bg-[var(--sidebar)]',
          'transform transition-transform duration-200 ease-in-out',
          'sm:w-72',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          desktopCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative shrink-0 border-b border-border p-4 sm:p-6">
            <button
              type="button"
              onClick={onMobileMenuClose}
              className="absolute right-3 top-3 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              aria-label={tHeader('closeMenu')}
            >
              <X size={20} />
            </button>

            <button
              type="button"
              onClick={onDesktopCollapse}
              className="absolute right-3 top-3 hidden rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:inline-flex"
              aria-label={t('collapseSidebar')}
              title={t('collapseSidebar')}
            >
              <PanelLeftClose size={20} />
            </button>

            <div className="flex items-center gap-3 pr-10 lg:pr-12">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Brain size={22} className="text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold leading-tight">Mind Haven</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('tagline')}</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
            <nav className="space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onMobileMenuClose}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-3.5 text-sm',
                      'transition-all duration-200 sm:px-4',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Icon size={20} className="shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                );
              })}

              {profile.role !== 'GUEST' && canAccessFeature('profile') && (
                <Link
                  href="/profile"
                  onClick={onMobileMenuClose}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-3.5 text-sm',
                    'transition-all duration-200 sm:px-4',
                    pathname === '/profile'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <User size={20} className="shrink-0" />
                  <span>{t('profile')}</span>
                </Link>
              )}

              {canAccessFeature('admin_panel') && (
                <Link
                  href="/admin"
                  onClick={onMobileMenuClose}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-3.5 text-sm',
                    'transition-all duration-200 sm:px-4',
                    pathname === '/admin'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Shield size={20} className="shrink-0" />
                  <span>{tHeader('adminPanel')}</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="shrink-0 space-y-3 border-t border-border bg-muted p-4 dark:bg-[var(--sidebar)] sm:space-y-4 sm:p-5">
            <div className="lg:hidden">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t('language')}</p>
              <LocaleSwitcher showIcon={false} triggerClassName="w-full" />
            </div>

            {isGuest ? (
              <>
                <SignInButton />
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  {t('guestStorageHint')}
                </p>
              </>
            ) : (
              <SignOutButton className="rounded-lg border border-border bg-background/40 text-center hover:bg-accent" />
            )}

            <ThemeToggle />
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={onMobileMenuClose}
          aria-hidden
        />
      )}
    </>
  );
}
