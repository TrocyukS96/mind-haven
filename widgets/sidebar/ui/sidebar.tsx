'use client';

import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useAccess } from '@/features/access';
import { useTheme } from '@/shared/hooks/use-theme';
import { cn } from '@/shared/lib/utils';
import {
  BookOpen,
  Brain,
  CheckSquare,
  Flame,
  Globe,
  Home,
  Menu,
  Moon,
  Shield,
  Sun,
  Table2,
  Target,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import type { FeatureKey } from '@/shared/config/features';
import { SidebarAuthSection } from './sidebar-auth-section';

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

export function Sidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations('sidebar');
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { getAccessibleFeatures, canAccessFeature } = useAccess();

  const visibleMenuItems = useMemo(
    () =>
      menuItems.filter((item) =>
        getAccessibleFeatures([item.feature]).includes(item.feature)
      ),
    [getAccessibleFeatures]
  );

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40',
          'w-64 bg-muted dark:bg-[var(--sidebar)] border-r border-border text-foreground',
          'transform transition-transform duration-200 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col pb-32">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Brain size={22} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">Mind Haven</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t('tagline')}</p>
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
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
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

              {canAccessFeature('admin_panel') && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
                    'transition-all duration-200',
                    pathname === '/admin'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  <Shield size={20} />
                  <span>{t('admin')}</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          'fixed left-0 z-40 w-64',
          'bg-[#f3f4f6] dark:bg-[var(--sidebar)]',
          'border-t border-r border-border',
          'transform transition-transform duration-200 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'bottom-0'
        )}
      >
        <SidebarAuthSection />

        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Globe size={16} />
            <span>{t('language')}</span>
          </div>
          <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ru">{t('ru')}</SelectItem>
              <SelectItem value="en">{t('en')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            'w-full cursor-pointer',
            'flex items-center justify-between px-6 py-4',
            'text-sm font-medium text-foreground transition-colors',
            'hover:bg-accent'
          )}
        >
          <span>{theme === 'dark' ? t('darkTheme') : t('lightTheme')}</span>
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
