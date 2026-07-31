'use client';

import { useMemo, useCallback, useState } from 'react';
import type { GlobalVoiceCommandResult } from '@/entities/voice';
import { useLocale } from 'next-intl';
import { useGlobalSpeechToText } from './use-global-speech-to-text';
import { useVoiceRecorder } from './use-voice-recorder';
import type { VoiceRecorderStatus } from '../model/types';

interface UseGlobalVoiceInputOptions {
  goals?: Array<{ id: string; title: string }>;
  tags?: Array<{ id: string; name: string }>;
  onResult: (result: GlobalVoiceCommandResult) => void;
  onError?: (error: unknown) => void;
}

interface UseGlobalVoiceInputReturn {
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

export function useGlobalVoiceInput({
  goals,
  tags,
  onResult,
  onError,
}: UseGlobalVoiceInputOptions): UseGlobalVoiceInputReturn {
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

  const { status: speechStatus, processAudio } = useGlobalSpeechToText({
    locale,
    goals,
    tags,
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
