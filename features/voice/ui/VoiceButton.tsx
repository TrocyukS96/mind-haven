'use client';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { Mic } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface VoiceButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function VoiceButton({
  onClick,
  disabled = false,
  className,
  size = 'lg',
}: VoiceButtonProps) {
  const t = useTranslations('voice');

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn(className)}
      aria-label={t('startRecording')}
    >
      <Mic className={size === 'icon' ? 'h-5 w-5' : 'mr-2 h-5 w-5'} />
      {size !== 'icon' && t('voiceInput')}
    </Button>
  );
}
