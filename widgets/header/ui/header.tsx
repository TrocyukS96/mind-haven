'use client';

import { PointsBadge } from '@/features/points';
import { GlobalVoiceButton } from '@/features/voice/ui/GlobalVoiceButton';
import { usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/shared/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

export function Header() {
  const t = useTranslations('header');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 relative flex min-h-14 shrink-0 items-center py-2',
        'border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'sm:min-h-16 sm:px-6'
      )}
    >
      <div className="relative z-10 flex flex-1 items-center justify-start">
        <PointsBadge compact className="voice-header-points shrink-0" />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <GlobalVoiceButton variant="header" className="pointer-events-auto" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-end">
        <div className="flex items-center gap-2">
          <Globe size={16} className="hidden text-muted-foreground sm:block" aria-hidden />
          <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger
              className="h-9 w-[7.25rem] text-xs sm:h-10 sm:w-32"
              aria-label={t('language')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="ru">{t('ru')}</SelectItem>
              <SelectItem value="en">{t('en')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
