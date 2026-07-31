'use client';

import { VoiceError, type VoiceErrorCode } from '@/entities/voice';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

const KNOWN_VOICE_ERROR_CODES: VoiceErrorCode[] = [
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

export function useVoiceErrorMessage() {
  const t = useTranslations('voice');

  return useCallback(
    (error: unknown): string => {
      if (error instanceof VoiceError) {
        const code = error.code as VoiceErrorCode;

        if (KNOWN_VOICE_ERROR_CODES.includes(code)) {
          return t(`errors.${code}`);
        }
      }

      return t('errors.generic');
    },
    [t]
  );
}
