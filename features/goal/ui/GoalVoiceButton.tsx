'use client';

import { isAuthenticatedUser } from '@/entities/user';
import { mapVoiceResultToGoalDraft } from '@/features/goal/lib/map-voice-to-goal-draft';
import type { ParsedGoalVoiceResult } from '@/entities/voice';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';
import { VoiceButton } from '@/features/voice/ui/VoiceButton';
import { VoiceRecorder } from '@/features/voice/ui/VoiceRecorder';
import { useVoiceInput } from '@/features/voice/hooks/use-voice-input';
import { useVoiceErrorMessage } from '@/features/voice/hooks/use-voice-error-message';
import { toast } from 'react-toastify';

export function GoalVoiceButton() {
  const { profile } = useAccess();
  const { openGoalFormFromVoice } = useStore();
  const resolveErrorMessage = useVoiceErrorMessage();
  const isAuthenticated = isAuthenticatedUser(profile);

  const voice = useVoiceInput<ParsedGoalVoiceResult>({
    entityType: 'goal',
    onResult: (result) => {
      openGoalFormFromVoice(mapVoiceResultToGoalDraft(result.parsed));
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
