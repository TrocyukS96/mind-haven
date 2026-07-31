'use client';

import { PointsBadge } from '@/features/points';
import { GlobalVoiceButton } from '@/features/voice/ui/GlobalVoiceButton';
import { LocaleSwitcher } from '@/widgets/header/ui/locale-switcher';
import { cn } from '@/shared/lib/utils';
import { Menu, PanelLeftOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface HeaderProps {
  onMobileMenuOpen?: () => void;
  onDesktopSidebarOpen?: () => void;
  showDesktopSidebarOpen?: boolean;
}

export function Header({
  onMobileMenuOpen,
  onDesktopSidebarOpen,
  showDesktopSidebarOpen = false,
}: HeaderProps) {
  const t = useTranslations('header');
  const tSidebar = useTranslations('sidebar');

  return (
    <header
      className={cn(
        'sticky top-0 z-30 grid shrink-0 items-center gap-2 py-2',
        'grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
        'border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'min-h-14 sm:min-h-16 sm:gap-3 sm:px-6'
      )}
    >
      <div className="flex min-w-0 items-center justify-start gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMobileMenuOpen}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm hover:bg-accent lg:hidden"
          aria-label={t('openMenu')}
        >
          <Menu size={20} />
        </button>

        {showDesktopSidebarOpen && (
          <button
            type="button"
            onClick={onDesktopSidebarOpen}
            className="hidden size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm hover:bg-accent lg:flex"
            aria-label={tSidebar('expandSidebar')}
            title={tSidebar('expandSidebar')}
          >
            <PanelLeftOpen size={20} />
          </button>
        )}

        <PointsBadge variant="header" className="shrink-0" />
      </div>

      <div className="flex justify-end lg:justify-center">
        <GlobalVoiceButton variant="header" />
      </div>

      <div className="hidden items-center justify-end lg:flex">
        <LocaleSwitcher triggerClassName="w-32" />
      </div>
    </header>
  );
}
