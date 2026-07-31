'use client';

import { RewardUnlockListener } from '@/features/points';
import { Header } from '@/widgets/header';
import { Sidebar } from '@/widgets/sidebar';
import { cn } from '@/shared/lib/utils';
import { useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'mindhaven-sidebar-collapsed';

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
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
          'flex min-h-screen flex-col transition-[padding] duration-200 ease-in-out',
          !desktopSidebarCollapsed && 'lg:pl-72'
        )}
      >
        <Header
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onDesktopSidebarOpen={() => setDesktopCollapsed(false)}
          showDesktopSidebarOpen={desktopSidebarCollapsed}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
