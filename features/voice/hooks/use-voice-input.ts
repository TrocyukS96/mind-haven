'use client';

import type { VoiceEntityType, VoiceGoalOption, VoiceProcessResult } from '@/entities/voice';
import { useLocale } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { useSpeechToText } from './use-speech-to-text';
import { useVoiceRecorder } from './use-voice-recorder';
import type { VoiceRecorderStatus } from '../model/types';

interface UseVoiceInputOptions<TParsed> {
  entityType: VoiceEntityType;
  goals?: VoiceGoalOption[];
  onResult: (result: VoiceProcessResult<TParsed>) => void;
  onError?: (error: unknown) => void;
}

interface UseVoiceInputReturn {
  status: VoiceRecorderStatus;
  durationMs: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  isRecording: boolean;
  isProcessing: boolean;
}

export function useVoiceInput<TParsed>({
  entityType,
  goals,
  onResult,
  onError,
}: UseVoiceInputOptions<TParsed>): UseVoiceInputReturn {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const handleRecorderError = useCallback(
    (error: unknown) => {
      onError?.(error);
    },
    [onError]
  );

  const handleSpeechError = useCallback(
    (error: unknown) => {
      setIsOpen(false);
      onError?.(error);
    },
    [onError]
  );

  const { status: speechStatus, processAudio } = useSpeechToText<TParsed>({
    entityType,
    locale,
    goals,
    onSuccess: (result) => {
      setIsOpen(false);
      onResult(result);
    },
    onError: handleSpeechError,
  });

  const { status: recorderStatus, durationMs, startRecording, stopRecording, cancelRecording, isRecording } =
    useVoiceRecorder({
      onRecordingComplete: processAudio,
      onError: handleRecorderError,
    });

  const status = useMemo<VoiceRecorderStatus>(() => {
    if (speechStatus === 'processing') {
      return 'processing';
    }

    if (recorderStatus === 'error') {
      return 'error';
    }

    return recorderStatus;
  }, [recorderStatus, speechStatus]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    cancelRecording();
    setIsOpen(false);
  }, [cancelRecording]);

  return {
    status,
    durationMs,
    isOpen,
    open,
    close,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording,
    isProcessing: status === 'processing',
  };
}
