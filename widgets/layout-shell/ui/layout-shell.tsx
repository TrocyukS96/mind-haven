'use client';

import { RewardUnlockListener } from '@/features/points';
import { usePathname } from '@/i18n/routing';
import { Header } from '@/widgets/header';
import { Sidebar } from '@/widgets/sidebar';
import { cn } from '@/shared/lib/utils';
import { useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'mindhaven-sidebar-collapsed';

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === 'true') {
        setDesktopSidebarCollapsed(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setDesktopCollapsed = (collapsed: boolean) => {
    setDesktopSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="min-h-screen">
      <RewardUnlockListener />
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuClose={() => setMobileMenuOpen(false)}
        desktopCollapsed={desktopSidebarCollapsed}
        onDesktopCollapse={() => setDesktopCollapsed(true)}
      />
      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ease-in-out',
          !desktopSidebarCollapsed && 'lg:pl-72'
        )}
      >
        <Header
          overlay={isHome}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onDesktopSidebarOpen={() => setDesktopCollapsed(false)}
          showDesktopSidebarOpen={desktopSidebarCollapsed}
        />
        <main
          id="app-main"
          className={cn(
            'min-w-0 flex-1',
            isHome ? 'overflow-visible' : 'overflow-auto px-3 py-4 sm:px-4 sm:py-5'
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
