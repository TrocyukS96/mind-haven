'use client';

import {
  processVoiceInput,
  type VoiceEntityType,
  type VoiceGoalOption,
  type VoiceProcessResult,
  type VoiceTagOption,
  type VoiceAccountOption,
} from '@/entities/voice';
import { useCallback, useState } from 'react';
import { logVoiceDebug } from '@/shared/lib/voice/log-voice-debug';
import { prepareRecordingForUpload } from '../lib/prepare-recording-audio';
import type { VoiceRecorderStatus } from '../model/types';

interface UseSpeechToTextOptions<TParsed> {
  entityType: VoiceEntityType;
  locale?: string;
  goals?: VoiceGoalOption[];
  tags?: VoiceTagOption[];
  accounts?: VoiceAccountOption[];
  onSuccess: (result: VoiceProcessResult<TParsed>) => void;
  onError?: (error: unknown) => void;
}

interface UseSpeechToTextReturn {
  status: VoiceRecorderStatus;
  processAudio: (audio: Blob) => Promise<void>;
  reset: () => void;
}

export function useSpeechToText<TParsed>({
  entityType,
  locale,
  goals,
  tags,
  accounts,
  onSuccess,
  onError,
}: UseSpeechToTextOptions<TParsed>): UseSpeechToTextReturn {
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

        const result = await processVoiceInput<TParsed>({
          audio: preparedAudio,
          entityType,
          locale,
          goals,
          tags,
          accounts,
        });
        logVoiceDebug('api-response', result);
        setStatus('idle');
        onSuccess(result);
      } catch (error) {
        logVoiceDebug('api-error', error);
        setStatus('error');
        onError?.(error);
        setStatus('idle');
      }
    },
    [entityType, goals, tags, accounts, locale, onError, onSuccess]
  );

  return {
    status,
    processAudio,
    reset,
  };
}
