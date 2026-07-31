'use client';

import { VoiceError } from '@/entities/voice';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MIN_RECORDING_MS,
  pickSupportedMimeType,
  type VoiceRecorderStatus,
} from '../model/types';

interface UseVoiceRecorderOptions {
  onRecordingComplete: (audio: Blob) => void;
  onError?: (error: unknown) => void;
}

interface UseVoiceRecorderReturn {
  status: VoiceRecorderStatus;
  durationMs: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  isRecording: boolean;
}

export function useVoiceRecorder({
  onRecordingComplete,
  onError,
}: UseVoiceRecorderOptions): UseVoiceRecorderReturn {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const [durationMs, setDurationMs] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const sessionRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const resetRecorder = useCallback(() => {
    clearTimer();
    stopMediaStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = null;
    setDurationMs(0);
    setStatus('idle');
  }, [clearTimer, stopMediaStream]);

  const invalidateSession = useCallback(() => {
    sessionRef.current += 1;
    cancelledRef.current = true;
    stopMediaStream();
  }, [stopMediaStream]);

  const reportError = useCallback(
    (error: unknown) => {
      let normalized: unknown = error;

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          normalized = new VoiceError('MICROPHONE_DENIED', 'Microphone access denied');
        } else if (error.name === 'NotFoundError') {
          normalized = new VoiceError('MICROPHONE_UNAVAILABLE', 'No microphone found');
        }
      }

      setStatus('error');
      onError?.(normalized);
    },
    [onError]
  );

  const startRecording = useCallback(async () => {
    if (status === 'recording') {
      return;
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      reportError(new VoiceError('MICROPHONE_UNAVAILABLE', 'Microphone is not supported'));
      return;
    }

    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    cancelledRef.current = false;

    clearTimer();
    stopMediaStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = null;
    setDurationMs(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (sessionId !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      mediaStreamRef.current = stream;

      const mimeType = pickSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      if (sessionId !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        return;
      }

      chunksRef.current = [];
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setDurationMs(0);
      setStatus('recording');

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        reportError(new VoiceError('MICROPHONE_UNAVAILABLE', 'Recording failed'));
      };

      recorder.onstop = () => {
        clearTimer();
        stopMediaStream();

        if (cancelledRef.current) {
          resetRecorder();
          return;
        }

        const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : 0;

        if (elapsed < MIN_RECORDING_MS || chunksRef.current.length === 0) {
          reportError(new VoiceError('RECORDING_TOO_SHORT', 'Recording is too short'));
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });

        setStatus('idle');
        onRecordingComplete(blob);
      };

      // Single blob on stop — concatenated timeslice chunks produce invalid WebM.
      recorder.start();

      timerRef.current = window.setInterval(() => {
        if (startedAtRef.current) {
          setDurationMs(Date.now() - startedAtRef.current);
        }
      }, 200);
    } catch (error) {
      if (sessionId !== sessionRef.current) {
        return;
      }

      stopMediaStream();
      reportError(error);
    }
  }, [
    clearTimer,
    onRecordingComplete,
    reportError,
    resetRecorder,
    status,
    stopMediaStream,
  ]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    if (recorder.state === 'recording') {
      recorder.requestData();
    }

    recorder.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    invalidateSession();

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }

    resetRecorder();
  }, [invalidateSession, resetRecorder]);

  useEffect(() => {
    return () => {
      invalidateSession();
      clearTimer();

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    };
  }, [clearTimer, invalidateSession]);

  return {
    status,
    durationMs,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: status === 'recording',
  };
}
