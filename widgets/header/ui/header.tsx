'use client';

import { useAccess } from '@/features/access';
import { SignInButton, SignOutButton } from '@/features/auth';
import { usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/shared/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Globe, Menu, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

interface HeaderProps {
  mobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
}

export function Header({ mobileMenuOpen, onMobileMenuToggle }: HeaderProps) {
  const t = useTranslations('header');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { profile } = useAccess();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4',
        'border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'lg:px-6'
      )}
    >
      <button
        type="button"
        onClick={onMobileMenuToggle}
        className="rounded-lg p-2 text-foreground hover:bg-accent lg:hidden"
        aria-label={mobileMenuOpen ? t('closeMenu') : t('openMenu')}
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <Globe size={16} className="hidden text-muted-foreground sm:block" />
          <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger className="h-9 w-[7.5rem] text-xs sm:w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ru">{t('ru')}</SelectItem>
              <SelectItem value="en">{t('en')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {profile.role === 'GUEST' ? (
          <SignInButton className="w-auto px-3 py-2 text-xs sm:px-4 sm:text-sm" />
        ) : (
          <SignOutButton className="w-auto px-3 py-2 text-xs sm:px-4 sm:text-sm" />
        )}
      </div>
    </header>
  );
}
