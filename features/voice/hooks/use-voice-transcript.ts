'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { useVoiceRecorder } from './use-voice-recorder';
import { useVoiceTranscribe } from './use-voice-transcribe';
import type { VoiceRecorderStatus } from '../model/types';

interface UseVoiceTranscriptOptions {
  onResult: (transcript: string) => void;
  onError?: (error: unknown) => void;
}

interface UseVoiceTranscriptReturn {
  status: VoiceRecorderStatus;
  durationMs: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  isProcessing: boolean;
}

export function useVoiceTranscript({
  onResult,
  onError,
}: UseVoiceTranscriptOptions): UseVoiceTranscriptReturn {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const handleSpeechError = useCallback(
    (error: unknown) => {
      setIsOpen(false);
      onError?.(error);
    },
    [onError]
  );

  const { status: transcribeStatus, transcribeAudio } = useVoiceTranscribe({
    locale,
    onSuccess: (transcript) => {
      setIsOpen(false);
      onResult(transcript);
    },
    onError: handleSpeechError,
  });

  const handleRecorderError = useCallback(
    (error: unknown) => {
      onError?.(error);
    },
    [onError]
  );

  const { status: recorderStatus, durationMs, startRecording, stopRecording, cancelRecording } =
    useVoiceRecorder({
      onRecordingComplete: transcribeAudio,
      onError: handleRecorderError,
    });

  const status = useMemo<VoiceRecorderStatus>(() => {
    if (transcribeStatus === 'processing') {
      return 'processing';
    }

    if (recorderStatus === 'error') {
      return 'error';
    }

    return recorderStatus;
  }, [recorderStatus, transcribeStatus]);

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
    isProcessing: status === 'processing',
  };
}
