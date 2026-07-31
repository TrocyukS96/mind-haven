'use client';

import { isAuthenticatedUser } from '@/entities/user';
import type { ParsedHabitVoiceResult } from '@/entities/voice';
import { mapVoiceResultToHabitDraft } from '@/features/habit/lib/map-voice-to-habit-draft';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';
import { VoiceButton } from '@/features/voice/ui/VoiceButton';
import { VoiceRecorder } from '@/features/voice/ui/VoiceRecorder';
import { useVoiceInput } from '@/features/voice/hooks/use-voice-input';
import { useVoiceErrorMessage } from '@/features/voice/hooks/use-voice-error-message';
import { toast } from 'react-toastify';

export function HabitVoiceButton() {
  const { profile } = useAccess();
  const { openHabitFormFromVoice } = useStore();
  const resolveErrorMessage = useVoiceErrorMessage();
  const isAuthenticated = isAuthenticatedUser(profile);

  const voice = useVoiceInput<ParsedHabitVoiceResult>({
    entityType: 'habit',
    onResult: (result) => {
      openHabitFormFromVoice(mapVoiceResultToHabitDraft(result.parsed));
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
      <VoiceButton onClick={voice.open} disabled={voice.isProcessing} />

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
