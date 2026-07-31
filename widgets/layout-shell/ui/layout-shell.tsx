'use client';

import { RewardUnlockListener } from '@/features/points';
import { Header } from '@/widgets/header';
import { Sidebar } from '@/widgets/sidebar';
import { cn } from '@/shared/lib/utils';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations('header');

  return (
    <div className="min-h-screen">
      <RewardUnlockListener />
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex min-h-screen flex-col lg:pl-72">
        <Header />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className={cn(
          'fixed bottom-5 left-5 z-40 flex size-14 items-center justify-center rounded-full',
          'border border-border bg-background text-foreground shadow-lg',
          'transition-transform hover:scale-105 active:scale-95 lg:hidden',
          mobileMenuOpen && 'pointer-events-none scale-0 opacity-0'
        )}
        aria-label={t('openMenu')}
        aria-expanded={mobileMenuOpen}
      >
        <Menu size={22} />
      </button>
    </div>
  );
}
