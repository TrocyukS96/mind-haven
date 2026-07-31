'use client';

import { isAuthenticatedUser } from '@/entities/user';
import type { ParsedJournalVoiceResult } from '@/entities/voice';
import { mapVoiceResultToJournalDraft } from '@/features/journal/lib/map-voice-to-journal-draft';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';
import { VoiceButton } from '@/features/voice/ui/VoiceButton';
import { VoiceRecorder } from '@/features/voice/ui/VoiceRecorder';
import { useVoiceInput } from '@/features/voice/hooks/use-voice-input';
import { useVoiceErrorMessage } from '@/features/voice/hooks/use-voice-error-message';
import { useMemo } from 'react';
import { toast } from 'react-toastify';

interface JournalVoiceButtonProps {
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function JournalVoiceButton({ className, size }: JournalVoiceButtonProps = {}) {
  const { profile } = useAccess();
  const { openJournalFormFromVoice, journalTags } = useStore();
  const resolveErrorMessage = useVoiceErrorMessage();
  const isAuthenticated = isAuthenticatedUser(profile);

  const voiceTags = useMemo(
    () => journalTags.map((tag) => ({ id: tag.id, name: tag.name })),
    [journalTags]
  );

  const voice = useVoiceInput<ParsedJournalVoiceResult>({
    entityType: 'journal',
    tags: voiceTags,
    onResult: (result) => {
      openJournalFormFromVoice(mapVoiceResultToJournalDraft(result.parsed));
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
        className={className}
        size={size}
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
