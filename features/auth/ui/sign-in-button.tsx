'use client';

import { cn } from '@/shared/lib/utils';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';

interface SignInButtonProps {
  className?: string;
}

export function SignInButton({ className }: SignInButtonProps) {
  const t = useTranslations('sidebar');

  return (
    <button
      type="button"
      onClick={() => signIn('google', { callbackUrl: window.location.href })}
      className={cn(
        'w-full rounded-lg px-4 py-2.5 text-sm font-medium',
        'bg-primary text-primary-foreground hover:opacity-90 transition-opacity',
        className
      )}
    >
      {t('signInWithGoogle')}
    </button>
  );
}
