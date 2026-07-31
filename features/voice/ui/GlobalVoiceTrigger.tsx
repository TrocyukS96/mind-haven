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
        'cursor-pointer touch-manipulation',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--voice-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60',
        isSidebar && 'my-0 w-full justify-center',
        isHeader && 'my-0 justify-center',
        !isSidebar && !isHeader && 'my-1 justify-center',
        className
      )}
    >
      {!disabled && !isProcessing && !isHeader && (
        <>
          <span aria-hidden className="voice-accent-ring voice-accent-ring--outer" />
          <span aria-hidden className="voice-accent-ring voice-accent-ring--inner" />
        </>
      )}

      {!disabled && !isProcessing && isHeader && (
        <span
          aria-hidden
          className="voice-accent-ring voice-accent-ring--outer hidden lg:block"
        />
      )}

      <span
        className={cn(
          'voice-accent-pill relative flex items-center overflow-hidden transition-all duration-200',
          'group-hover:scale-[1.02] group-active:scale-[0.98]',
          isSidebar && 'w-full justify-center gap-2.5 rounded-xl px-3 py-2.5',
          isHeader &&
            'voice-accent-pill--header gap-2 rounded-xl px-2.5 py-1.5 lg:gap-2.5 lg:rounded-full lg:py-1 lg:pl-1 lg:pr-3 xl:pr-4',
          !isSidebar &&
            !isHeader &&
            'gap-2.5 rounded-full px-1 py-1 md:pr-4 md:pl-1'
        )}
      >
        <span
          className={cn(
            'voice-accent-icon relative flex shrink-0 items-center justify-center',
            isSidebar && 'size-9 rounded-full',
            isHeader && 'size-8 rounded-lg lg:size-10 lg:rounded-full',
            !isSidebar && !isHeader && 'size-9 rounded-full md:size-10',
            isProcessing && 'opacity-90'
          )}
        >
          {isProcessing ? (
            <Loader2 className="size-4 animate-spin lg:size-[1.125rem]" />
          ) : (
            <>
              <Mic className="relative z-10 size-4 lg:size-[1.125rem]" strokeWidth={2.25} />
              {!isHeader && <span aria-hidden className="voice-accent-wave" />}
            </>
          )}
        </span>

        {isHeader ? (
          <>
            <span className="whitespace-nowrap text-xs font-medium text-foreground sm:hidden">
              {t('globalVoiceShortLabel')}
            </span>
            <span className="hidden whitespace-nowrap text-xs font-medium text-foreground sm:inline sm:text-sm lg:hidden">
              {t('globalVoiceHeaderLabel')}
            </span>
            <span className="hidden whitespace-nowrap pr-0.5 text-sm font-medium text-foreground lg:inline">
              {t('globalVoiceHeaderLabel')}
            </span>
          </>
        ) : (
          <span
            className={cn(
              'whitespace-nowrap font-medium text-foreground',
              isSidebar && 'inline pr-1 text-sm',
              !isSidebar && 'hidden text-sm md:inline md:pr-0.5'
            )}
          >
            {t('globalVoiceHeaderLabel')}
          </span>
        )}
      </span>
    </button>
  );
}
