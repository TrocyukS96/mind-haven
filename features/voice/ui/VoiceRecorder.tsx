'use client';

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { Loader2, Mic, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { formatRecordingDuration } from '../model/types';
import type { VoiceRecorderStatus } from '../model/types';

interface VoiceRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: VoiceRecorderStatus;
  durationMs: number;
  onStart: () => Promise<void>;
  onStop: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  processingDescription?: string;
}

export function VoiceRecorder({
  open,
  onOpenChange,
  status,
  durationMs,
  onStart,
  onStop,
  onCancel,
  title,
  description,
  processingDescription,
}: VoiceRecorderProps) {
  const t = useTranslations('voice');
  const isRecording = status === 'recording';
  const isProcessing = status === 'processing';

  const dialogTitle = isProcessing
    ? t('processing')
    : isRecording
      ? t('recording')
      : (title ?? t('voiceInput'));

  const dialogDescription = isProcessing
    ? (processingDescription ?? t('processingDescription'))
    : (description ?? t('recordingDescription'));

  useEffect(() => {
    if (open && status === 'idle') {
      void onStart();
    }
  }, [open, onStart, status]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onCancel();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isProcessing}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div
            className={cn(
              'relative flex h-24 w-24 items-center justify-center rounded-full border-2',
              isRecording && 'border-red-500 bg-red-500/10',
              isProcessing && 'border-primary bg-primary/10',
              !isRecording && !isProcessing && 'border-muted bg-muted/40'
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            ) : (
              <Mic className={cn('h-10 w-10', isRecording ? 'text-red-500' : 'text-muted-foreground')} />
            )}

            {isRecording && (
              <span className="absolute inset-0 animate-ping rounded-full border border-red-500/40" />
            )}
          </div>

          <div className="text-center">
            {isRecording && (
              <>
                <p className="text-3xl font-mono font-semibold tabular-nums">
                  {formatRecordingDuration(durationMs)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{t('tapToStop')}</p>
              </>
            )}

            {isProcessing && (
              <p className="text-sm text-muted-foreground">{t('pleaseWait')}</p>
            )}
          </div>

          <div className="flex w-full gap-3">
            {!isProcessing && (
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                {t('cancel')}
              </Button>
            )}

            {isRecording && (
              <Button type="button" className="flex-1" onClick={onStop}>
                <Square className="mr-2 h-4 w-4 fill-current" />
                {t('stop')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
