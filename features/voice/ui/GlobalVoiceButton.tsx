'use client';

import { useMemo } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useGlobalVoiceInput } from '../hooks/use-global-voice-input';
import { useVoiceErrorMessage } from '../hooks/use-voice-error-message';
import { routeGlobalVoiceResult } from '../lib/route-global-voice-result';
import { GlobalVoiceTrigger } from './GlobalVoiceTrigger';
import { VoiceRecorder } from './VoiceRecorder';

interface GlobalVoiceButtonProps {
  className?: string;
  variant?: 'inline' | 'sidebar' | 'header';
}

export function GlobalVoiceButton({ className, variant = 'inline' }: GlobalVoiceButtonProps) {
  const { profile } = useAccess();
  const t = useTranslations('voice');
  const resolveErrorMessage = useVoiceErrorMessage();
  const isAuthenticated = isAuthenticatedUser(profile);

  const {
    goals,
    journalTags,
    openTaskFormFromVoice,
    openGoalFormFromVoice,
    openJournalFormFromVoice,
    openHabitFormFromVoice,
  } = useStore();

  const voiceGoals = useMemo(
    () => goals.map((goal) => ({ id: goal.id, title: goal.title })),
    [goals]
  );

  const voiceTags = useMemo(
    () => journalTags.map((tag) => ({ id: tag.id, name: tag.name })),
    [journalTags]
  );

  const voice = useGlobalVoiceInput({
    goals: voiceGoals,
    tags: voiceTags,
    onResult: (result) => {
      const entityType = routeGlobalVoiceResult(result, {
        openTaskFormFromVoice,
        openGoalFormFromVoice,
        openJournalFormFromVoice,
        openHabitFormFromVoice,
      });
      toast.success(t(`detectedSection.${entityType}`));
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
      <GlobalVoiceTrigger
        onClick={voice.open}
        disabled={voice.isProcessing}
        isProcessing={voice.isProcessing}
        variant={variant}
        className={cn(className)}
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
        title={voice.isProcessing ? undefined : t('globalVoiceInput')}
        description={
          voice.isProcessing ? t('globalProcessingDescription') : t('globalRecordingDescription')
        }
        processingDescription={t('globalProcessingDescription')}
      />
    </>
  );
}
