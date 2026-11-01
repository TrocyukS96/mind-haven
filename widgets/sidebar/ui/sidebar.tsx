'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useAccess } from '@/features/access';
import { SignInButton, SignOutButton } from '@/features/auth';
import { LocaleSwitcher } from '@/widgets/header/ui/locale-switcher';
import { ForestProgress } from '@/widgets/sidebar/ui/forest-progress';
import { cn } from '@/shared/lib/utils';
import {
  Apple,
  BookOpen,
  Footprints,
  Home,
  Leaf,
  PanelLeftClose,
  Shield,
  Sprout,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { AppLogo } from '@/shared/ui/app-logo';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { UI_HIDDEN_FEATURES, type FeatureKey } from '@/shared/config/features';
import { ThemeToggle } from './theme-toggle';

const primaryItems: {
  id: string;
  labelKey: string;
  icon: typeof Home;
  href: '/' | '/goals' | '/tasks' | '/habits' | '/journal' | '/rewards';
  feature: FeatureKey;
}[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: Home, href: '/', feature: 'dashboard' },
  { id: 'goals', labelKey: 'goals', icon: Sprout, href: '/goals', feature: 'goals' },
  { id: 'tasks', labelKey: 'tasks', icon: Footprints, href: '/tasks', feature: 'tasks' },
  { id: 'habits', labelKey: 'habits', icon: Leaf, href: '/habits', feature: 'habits' },
  { id: 'journal', labelKey: 'journal', icon: BookOpen, href: '/journal', feature: 'journal' },
  { id: 'rewards', labelKey: 'rewards', icon: Apple, href: '/rewards', feature: 'gamification' },
];

const secondaryItems: {
  id: string;
  labelKey: string;
  icon: typeof Wallet;
  href: '/finance';
  feature: FeatureKey;
}[] = [{ id: 'finance', labelKey: 'finance', icon: Wallet, href: '/finance', feature: 'finance' }];

interface SidebarProps {
  mobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
  desktopCollapsed?: boolean;
  onDesktopCollapse?: () => void;
}

function navItemClass(isActive: boolean) {
  return cn(
    'relative z-10 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors sm:px-3.5',
    isActive
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  );
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

  const visiblePrimary = useMemo(
    () =>
      primaryItems.filter(
        (item) =>
          !UI_HIDDEN_FEATURES.has(item.feature) &&
          getAccessibleFeatures([item.feature]).includes(item.feature)
      ),
    [getAccessibleFeatures]
  );
  const visibleSecondary = useMemo(
    () =>
      secondaryItems.filter(
        (item) =>
          !UI_HIDDEN_FEATURES.has(item.feature) &&
          getAccessibleFeatures([item.feature]).includes(item.feature)
      ),
    [getAccessibleFeatures]
  );
  const showProfile = profile.role !== 'GUEST' && canAccessFeature('profile');
  const showAdmin = canAccessFeature('admin_panel');

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[min(100vw-1.5rem,18rem)] flex-col overflow-hidden',
          'border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
          'transform transition-transform duration-200 ease-in-out',
          'sm:w-72',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          desktopCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'
        )}
      >
        <img
          src="/forest/sidebar-dark.jpg"
          alt=""
          className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-center dark:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-sidebar/80 via-sidebar/62 to-sidebar/88 dark:block"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative shrink-0 border-b border-sidebar-border p-4 sm:p-6">
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
              <AppLogo size={40} />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold leading-tight tracking-tight">{t('brand')}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('tagline')}</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
            <nav className="relative space-y-1">
              <div
                className="pointer-events-none absolute bottom-3 left-[1.35rem] top-3 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent"
                aria-hidden
              />
              {visiblePrimary.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onMobileMenuClose}
                    className={navItemClass(isActive)}
                  >
                    <Icon size={20} className="shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </nav>

            {visibleSecondary.length > 0 || showProfile || showAdmin ? (
              <div className="mt-4 border-t border-sidebar-border pt-4">
                <nav className="space-y-1">
                  {visibleSecondary.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={onMobileMenuClose}
                        className={navItemClass(isActive)}
                      >
                        <Icon size={20} className="shrink-0" />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </Link>
                    );
                  })}

                  {showProfile && (
                    <Link
                      href="/profile"
                      onClick={onMobileMenuClose}
                      className={navItemClass(pathname === '/profile')}
                    >
                      <User size={20} className="shrink-0" />
                      <span>{t('profile')}</span>
                    </Link>
                  )}

                  {showAdmin && (
                    <Link
                      href="/admin"
                      onClick={onMobileMenuClose}
                      className={navItemClass(pathname === '/admin')}
                    >
                      <Shield size={20} className="shrink-0" />
                      <span>{tHeader('adminPanel')}</span>
                    </Link>
                  )}
                </nav>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 space-y-3 border-t border-sidebar-border bg-sidebar p-4 sm:space-y-4 sm:p-5 dark:bg-sidebar/55">
            <ForestProgress />

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
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={onMobileMenuClose}
          aria-hidden
        />
      )}
    </>
  );
}
