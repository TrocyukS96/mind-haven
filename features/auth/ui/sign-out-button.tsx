'use client';

import { cn } from '@/shared/lib/utils';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const t = useTranslations('sidebar');

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className={cn(
        'w-full rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors text-left',
        className
      )}
    >
      {t('signOut')}
    </button>
  );
}
