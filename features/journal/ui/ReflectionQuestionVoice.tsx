'use client';

import { isAuthenticatedUser } from '@/entities/user';
import { useAccess } from '@/features/access';
import { useVoiceErrorMessage } from '@/features/voice/hooks/use-voice-error-message';
import { useVoiceTranscript } from '@/features/voice/hooks/use-voice-transcript';
import { VoiceRecorder } from '@/features/voice/ui/VoiceRecorder';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { Mic } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

interface ReflectionQuestionVoiceProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ReflectionQuestionVoice({
  value,
  onChange,
  className,
}: ReflectionQuestionVoiceProps) {
  const { profile } = useAccess();
  const t = useTranslations('voice');
  const resolveErrorMessage = useVoiceErrorMessage();
  const isAuthenticated = isAuthenticatedUser(profile);

  const voice = useVoiceTranscript({
    onResult: (transcript) => {
      const current = value.trim();
      onChange(current ? `${current} ${transcript}` : transcript);
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error));
    },
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={voice.open}
        disabled={voice.isProcessing}
        className={cn('shrink-0', className)}
        aria-label={t('startRecording')}
      >
        <Mic className="h-4 w-4" />
      </Button>

      <VoiceRecorder
        open={voice.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            voice.close();
          }
        }}
        status={voice.status}
        durationMs={voice.durationMs}
        onStart={voice.startRecording}
        onStop={voice.stopRecording}
        onCancel={voice.cancelRecording}
      />
    </>
  );
}
