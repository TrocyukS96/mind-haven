'use client';

import {
  processGlobalVoiceCommand,
  type GlobalVoiceCommandResult,
  type VoiceGoalOption,
  type VoiceTagOption,
} from '@/entities/voice';
import { useCallback, useState } from 'react';
import { logVoiceDebug } from '@/shared/lib/voice/log-voice-debug';
import { prepareRecordingForUpload } from '../lib/prepare-recording-audio';
import type { VoiceRecorderStatus } from '../model/types';

interface UseGlobalSpeechToTextOptions {
  locale?: string;
  goals?: VoiceGoalOption[];
  tags?: VoiceTagOption[];
  onSuccess: (result: GlobalVoiceCommandResult) => void;
  onError?: (error: unknown) => void;
}

interface UseGlobalSpeechToTextReturn {
  status: VoiceRecorderStatus;
  processAudio: (audio: Blob) => Promise<void>;
  reset: () => void;
}

export function useGlobalSpeechToText({
  locale,
  goals,
  tags,
  onSuccess,
  onError,
}: UseGlobalSpeechToTextOptions): UseGlobalSpeechToTextReturn {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');

  const reset = useCallback(() => {
    setStatus('idle');
  }, []);

  const processAudio = useCallback(
    async (audio: Blob) => {
      setStatus('processing');

      try {
        const preparedAudio = await prepareRecordingForUpload(audio);

        logVoiceDebug('prepared-audio', {
          originalType: audio.type,
          preparedType: preparedAudio.type,
          size: preparedAudio.size,
        });

        const result = await processGlobalVoiceCommand({
          audio: preparedAudio,
          locale,
          goals,
          tags,
        });

        logVoiceDebug('global-api-response', result);
        setStatus('idle');
        onSuccess(result);
      } catch (error) {
        logVoiceDebug('global-api-error', error);
        setStatus('error');
        onError?.(error);
        setStatus('idle');
      }
    },
    [goals, tags, locale, onError, onSuccess]
  );

  return {
    status,
    processAudio,
    reset,
  };
}
