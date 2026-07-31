'use client';

import { transcribeVoiceRecording } from '@/entities/voice/api/voice-transcribe-client';
import { useCallback, useState } from 'react';
import { logVoiceDebug } from '@/shared/lib/voice/log-voice-debug';
import { prepareRecordingForUpload } from '../lib/prepare-recording-audio';
import type { VoiceRecorderStatus } from '../model/types';

interface UseVoiceTranscribeOptions {
  locale?: string;
  onSuccess: (transcript: string) => void;
  onError?: (error: unknown) => void;
}

interface UseVoiceTranscribeReturn {
  status: VoiceRecorderStatus;
  transcribeAudio: (audio: Blob) => Promise<void>;
}

export function useVoiceTranscribe({
  locale,
  onSuccess,
  onError,
}: UseVoiceTranscribeOptions): UseVoiceTranscribeReturn {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');

  const transcribeAudio = useCallback(
    async (audio: Blob) => {
      setStatus('processing');

      try {
        const preparedAudio = await prepareRecordingForUpload(audio);

        logVoiceDebug('transcribe-prepared-audio', {
          originalType: audio.type,
          preparedType: preparedAudio.type,
          size: preparedAudio.size,
        });

        const result = await transcribeVoiceRecording({
          audio: preparedAudio,
          locale,
        });

        logVoiceDebug('transcribe-result', result);
        setStatus('idle');
        onSuccess(result.transcript);
      } catch (error) {
        logVoiceDebug('transcribe-error', error);
        setStatus('error');
        onError?.(error);
        setStatus('idle');
      }
    },
    [locale, onError, onSuccess]
  );

  return {
    status,
    transcribeAudio,
  };
}
