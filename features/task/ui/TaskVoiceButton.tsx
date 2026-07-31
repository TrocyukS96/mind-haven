'use client';

import { useMemo } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import { mapVoiceResultToTaskDraft } from '@/features/task/lib/map-voice-to-task-draft';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';
import { VoiceButton } from '@/features/voice/ui/VoiceButton';
import { VoiceRecorder } from '@/features/voice/ui/VoiceRecorder';
import { useVoiceInput } from '@/features/voice/hooks/use-voice-input';
import { VoiceError, type VoiceErrorCode } from '@/shared/lib/voice/types';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

export function TaskVoiceButton() {
  const { profile } = useAccess();
  const { openTaskFormFromVoice, goals } = useStore();
  const t = useTranslations('voice');
  const isAuthenticated = isAuthenticatedUser(profile);

  const voiceGoals = useMemo(
    () => goals.map((goal) => ({ id: goal.id, title: goal.title })),
    [goals]
  );

  const resolveErrorMessage = (error: unknown): string => {
    if (error instanceof VoiceError) {
      const code = error.code as VoiceErrorCode;
      const knownCodes: VoiceErrorCode[] = [
        'MICROPHONE_DENIED',
        'MICROPHONE_UNAVAILABLE',
        'NO_RECORDING',
        'RECORDING_TOO_SHORT',
        'NETWORK_ERROR',
        'AI_ERROR',
        'AI_QUOTA_EXHAUSTED',
        'PARSE_ERROR',
        'INVALID_RESPONSE',
        'CONFIG_ERROR',
        'UNAUTHORIZED',
      ];

      if (knownCodes.includes(code)) {
        return t(`errors.${code}`);
      }
    }

    return t('errors.generic');
  };

  const voice = useVoiceInput({
    entityType: 'task',
    goals: voiceGoals,
    onResult: (result) => {
      openTaskFormFromVoice(mapVoiceResultToTaskDraft(result.parsed));
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
      <VoiceButton
        onClick={voice.open}
        disabled={voice.isProcessing}
      />

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
