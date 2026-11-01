'use client';

import { EnergyBadge } from '@/features/energy/ui/energy-badge';
import { GlobalVoiceButton } from '@/features/voice/ui/GlobalVoiceButton';
import { LocaleSwitcher } from '@/widgets/header/ui/locale-switcher';
import { cn } from '@/shared/lib/utils';
import { Menu, PanelLeftOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface HeaderProps {
  onMobileMenuOpen?: () => void;
  onDesktopSidebarOpen?: () => void;
  showDesktopSidebarOpen?: boolean;
  overlay?: boolean;
}

export function Header({
  onMobileMenuOpen,
  onDesktopSidebarOpen,
  showDesktopSidebarOpen = false,
  overlay = false,
}: HeaderProps) {
  const t = useTranslations('header');
  const tSidebar = useTranslations('sidebar');
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setElevated(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overlay]);

  const showSurface = !overlay || elevated;

  return (
    <header
      className={cn(
        'z-30 grid shrink-0 items-center gap-2 px-3 sm:gap-3 sm:px-6',
        'grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
        overlay ? 'sticky top-0 h-14 sm:h-16' : 'sticky top-0 min-h-14 py-2 sm:min-h-16',
        showSurface
          ? 'border-b border-border/80 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/65'
          : 'border-b border-transparent bg-transparent'
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

        <EnergyBadge className="shrink-0" />
      </div>

      <div className="flex justify-end lg:justify-center">
        <GlobalVoiceButton variant="header" />
      </div>

      <div className="hidden items-center justify-end lg:flex">
        <LocaleSwitcher
          triggerClassName={cn('w-32', overlay && !elevated && 'bg-background/80 backdrop-blur-md')}
        />
      </div>
    </header>
  );
}
