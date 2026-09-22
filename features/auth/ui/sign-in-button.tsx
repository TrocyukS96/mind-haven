'use client';

import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AuthModal } from './auth-modal';

interface SignInButtonProps {
  className?: string;
}

export function SignInButton({ className }: SignInButtonProps) {
  const t = useTranslations('sidebar');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'w-full rounded-lg px-4 py-2.5 text-sm font-medium',
          'bg-primary text-primary-foreground hover:opacity-90 transition-opacity',
          className
        )}
      >
        {t('signIn')}
      </button>
      <AuthModal open={open} onOpenChange={setOpen} />
    </>
  );
}
