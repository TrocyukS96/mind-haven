'use client';

import { cn } from '@/shared/lib/utils';
import { Loader2, Mic } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface GlobalVoiceTriggerProps {
  onClick: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  className?: string;
  variant?: 'inline' | 'sidebar' | 'header';
}

export function GlobalVoiceTrigger({
  onClick,
  disabled = false,
  isProcessing = false,
  className,
  variant = 'inline',
}: GlobalVoiceTriggerProps) {
  const t = useTranslations('voice');
  const isSidebar = variant === 'sidebar';
  const isHeader = variant === 'header';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={t('globalVoiceInput')}
      title={t('globalVoiceInput')}
      className={cn(
        'voice-accent-trigger group relative flex shrink-0 items-center',
        'cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--voice-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60',
        isSidebar && 'my-0 w-full',
        isHeader && 'my-0',
        !isSidebar && !isHeader && 'my-1',
        className
      )}
    >
      {!disabled && !isProcessing && (
        <>
          <span aria-hidden className="voice-accent-ring voice-accent-ring--outer" />
          <span aria-hidden className="voice-accent-ring voice-accent-ring--inner" />
        </>
      )}

      <span
        className={cn(
          'voice-accent-pill relative flex items-center overflow-hidden transition-all duration-200',
          'group-hover:scale-[1.02] group-active:scale-[0.98]',
          isSidebar && 'w-full justify-center gap-2.5 rounded-xl px-3 py-2.5',
          isHeader &&
            'voice-accent-pill--header gap-2 rounded-full py-1 pl-1 pr-3 sm:gap-2.5 sm:pr-4',
          !isSidebar &&
            !isHeader &&
            'gap-2.5 rounded-full px-1 py-1 md:pr-4 md:pl-1'
        )}
      >
        <span
          className={cn(
            'voice-accent-icon relative flex shrink-0 items-center justify-center rounded-full',
            isSidebar && 'size-9',
            isHeader && 'size-9 sm:size-10',
            !isSidebar && !isHeader && 'size-9 md:size-10',
            isProcessing && 'opacity-90'
          )}
        >
          {isProcessing ? (
            <Loader2 className="size-4 animate-spin sm:size-[1.125rem]" />
          ) : (
            <>
              <Mic className="relative z-10 size-4 sm:size-[1.125rem]" strokeWidth={2.25} />
              <span aria-hidden className="voice-accent-wave" />
            </>
          )}
        </span>

        <span
          className={cn(
            'whitespace-nowrap font-medium text-foreground',
            isSidebar && 'inline pr-1 text-sm',
            isHeader && 'hidden text-sm sm:inline',
            !isSidebar && !isHeader && 'hidden text-sm md:inline md:pr-0.5'
          )}
        >
          {t('globalVoiceHeaderLabel')}
        </span>
      </span>
    </button>
  );
}
