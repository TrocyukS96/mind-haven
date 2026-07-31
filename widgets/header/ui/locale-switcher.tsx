'use client';

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

interface LocaleSwitcherProps {
  className?: string;
  showIcon?: boolean;
  triggerClassName?: string;
}

export function LocaleSwitcher({
  className,
  showIcon = true,
  triggerClassName,
}: LocaleSwitcherProps) {
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
    <div className={cn('flex items-center gap-2', className)}>
      {showIcon && <Globe size={16} className="shrink-0 text-muted-foreground" aria-hidden />}
      <Select value={locale} onValueChange={handleLocaleChange}>
        <SelectTrigger
          className={cn('h-9 w-full text-xs sm:h-10', triggerClassName)}
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
  );
}
